/**
 * Transform raw Gmail API data into clean, UI-ready types.
 * Keeps external API shapes out of the frontend.
 */

import type { GmailMessageRaw } from "./client";

export interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  timestamp: string;
  labels: string[];
  tag: "Job App" | "Interview" | "Follow Up" | "Inbox";
  isUnread: boolean;
}

// --- Header helpers ---

function getHeader(
  headers: { name: string; value: string }[],
  name: string
): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseSender(fromHeader: string): { name: string; email: string } {
  // Format: "Name <email@example.com>" or just "email@example.com"
  const match = fromHeader.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim(), email: match[2].trim() };
  }
  return { name: fromHeader.trim(), email: fromHeader.trim() };
}

// --- Tag detection ---

const JOB_KEYWORDS = [
  "application",
  "applied",
  "position",
  "role",
  "hiring",
  "job",
  "career",
  "greenhouse",
  "lever",
  "workday",
  "icims",
  "taleo",
  "smartrecruiters",
  "indeed",
  "linkedin job",
  "ashby",
  "rejected",
  "unfortunately",
  "moved forward",
  "not moving forward",
];

const INTERVIEW_KEYWORDS = [
  "interview",
  "technical screen",
  "phone screen",
  "onsite",
  "coding challenge",
  "take-home",
  "assessment",
  "schedule",
  "availability",
  "calendly",
  "meets",
  "zoom meeting",
];

const FOLLOW_UP_KEYWORDS = [
  "follow up",
  "following up",
  "circle back",
  "checking in",
  "just wanted to",
  "touching base",
  "any update",
  "status update",
];

function detectTag(subject: string, snippet: string): GmailEmail["tag"] {
  const text = `${subject} ${snippet}`.toLowerCase();

  if (INTERVIEW_KEYWORDS.some((kw) => text.includes(kw))) return "Interview";
  if (JOB_KEYWORDS.some((kw) => text.includes(kw))) return "Job App";
  if (FOLLOW_UP_KEYWORDS.some((kw) => text.includes(kw))) return "Follow Up";
  return "Inbox";
}

// --- Date formatting ---

function formatEmailDate(internalDate: string): { date: string; timestamp: string } {
  const d = new Date(Number(internalDate));
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const timestamp = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const date = isToday
    ? timestamp
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return { date, timestamp };
}

// --- Main transformer ---

export function transformMessage(raw: GmailMessageRaw): GmailEmail {
  const headers = raw.payload?.headers ?? [];
  const subject = getHeader(headers, "Subject") || "(No Subject)";
  const fromRaw = getHeader(headers, "From");
  const { name: from, email: fromEmail } = parseSender(fromRaw);
  const { date, timestamp } = formatEmailDate(raw.internalDate);
  const isUnread = raw.labelIds?.includes("UNREAD") ?? false;
  const tag = detectTag(subject, raw.snippet);

  return {
    id: raw.id,
    threadId: raw.threadId,
    from,
    fromEmail,
    subject,
    snippet: raw.snippet,
    date,
    timestamp,
    labels: raw.labelIds ?? [],
    tag,
    isUnread,
  };
}

export function transformMessages(rawMessages: GmailMessageRaw[]): GmailEmail[] {
  return rawMessages.map(transformMessage);
}
