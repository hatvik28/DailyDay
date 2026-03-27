/**
 * Gmail API cache layer.
 *
 * Stores the transformed email list in `GmailCache` so we don't
 * re-fetch from the Gmail API on every dashboard load.
 *
 * Cache TTL: 5 minutes.
 */

import { prisma } from "@/lib/prisma";
import { listMessages, getMessage, type GmailMessageRaw } from "@/lib/gmail/client";
import { transformMessages, type GmailEmail } from "@/lib/gmail/transformers";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface GmailCacheResult {
  emails: GmailEmail[];
  total: number;
  fromCache: boolean;
}

/**
 * Return cached Gmail emails, or fetch + cache if stale/missing.
 */
export async function getCachedGmailMessages(
  userId: string,
  accessToken: string,
  maxResults: number,
  query: string
): Promise<GmailCacheResult> {
  // --- Check cache ---
  const cached = await prisma.gmailCache.findUnique({
    where: { userId },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    try {
      const parsed = JSON.parse(cached.data) as { emails: GmailEmail[]; total: number };
      return { ...parsed, fromCache: true };
    } catch {
      // Corrupted cache — fall through to re-fetch
    }
  }

  // --- Cache miss or stale — fetch from API ---
  console.log("[Gmail Cache] MISS — fetching from API");

  const listResult = await listMessages(accessToken, maxResults, query);

  if (!listResult?.messages?.length) {
    const result = { emails: [], total: 0 };
    await writeCache(userId, result);
    return { ...result, fromCache: false };
  }

  const rawMessages = await Promise.all(
    listResult.messages.map((m) => getMessage(accessToken, m.id))
  );

  const validMessages = rawMessages.filter(
    (m): m is GmailMessageRaw => m !== null
  );

  const emails = transformMessages(validMessages);
  const result = { emails, total: listResult.resultSizeEstimate ?? emails.length };

  await writeCache(userId, result);

  return { ...result, fromCache: false };
}

/**
 * Invalidate the Gmail cache for a user (e.g. after disconnect).
 */
export async function invalidateGmailCache(userId: string): Promise<void> {
  await prisma.gmailCache.deleteMany({ where: { userId } });
}

// --- Internal ---

async function writeCache(
  userId: string,
  data: { emails: GmailEmail[]; total: number }
): Promise<void> {
  const serialized = JSON.stringify(data);
  await prisma.gmailCache.upsert({
    where: { userId },
    update: { data: serialized, fetchedAt: new Date() },
    create: { userId, data: serialized, fetchedAt: new Date() },
  });
}
