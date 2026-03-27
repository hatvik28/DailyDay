import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshAccessToken } from "@/lib/gmail/client";
import { getCachedGmailMessages } from "@/lib/gmail/cache";

async function getValidAccessToken(userId: string): Promise<string | null> {
  const token = await prisma.gmailToken.findUnique({
    where: { userId },
  });

  if (!token) return null;

  // If token is still valid (with 60s buffer), use it
  if (token.expiresAt > new Date(Date.now() + 60_000)) {
    return token.accessToken;
  }

  // Refresh the token
  try {
    const refreshed = await refreshAccessToken(token.refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await prisma.gmailToken.update({
      where: { userId },
      data: {
        accessToken: refreshed.access_token,
        expiresAt,
        ...(refreshed.refresh_token
          ? { refreshToken: refreshed.refresh_token }
          : {}),
      },
    });

    return refreshed.access_token;
  } catch (error) {
    console.error("Failed to refresh Gmail token:", error);
    // Delete invalid token so user re-connects
    await prisma.gmailToken.delete({ where: { userId } });
    return null;
  }
}

export async function GET(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const maxResults = Math.min(Number(searchParams.get("max") ?? "10"), 20);
    const query = searchParams.get("q") ?? "";

    const accessToken = await getValidAccessToken(user.id!);

    if (!accessToken) {
      return NextResponse.json({
        connected: false,
        emails: [],
        message: "Gmail not connected",
      });
    }

    const { emails, total, fromCache } = await getCachedGmailMessages(
      user.id!,
      accessToken,
      maxResults,
      query
    );

    if (fromCache) {
      console.log("[Gmail Messages] Served from cache");
    }

    return NextResponse.json({
      connected: true,
      emails,
      total,
    });
  } catch (error) {
    console.error("GET /api/gmail/messages error:", error);

    if (error instanceof Error && error.message === "GMAIL_TOKEN_EXPIRED") {
      return NextResponse.json({
        connected: false,
        emails: [],
        message: "Gmail session expired. Please reconnect.",
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch Gmail messages" },
      { status: 500 }
    );
  }
}
