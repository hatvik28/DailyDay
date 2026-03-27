import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeToken } from "@/lib/gmail/client";
import { invalidateGmailCache } from "@/lib/gmail/cache";

export async function POST() {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: user.id! },
    });

    if (gmailToken) {
      await revokeToken(gmailToken.accessToken);
      await prisma.gmailToken.delete({
        where: { userId: user.id! },
      });
      await invalidateGmailCache(user.id!);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/gmail/disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Gmail" },
      { status: 500 }
    );
  }
}
