import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeToken } from "@/lib/fitbit";

export async function POST() {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fitbitToken = await prisma.fitbitToken.findUnique({
      where: { userId: user.id! },
    });

    if (fitbitToken) {
      await revokeToken(fitbitToken.accessToken);
      await prisma.fitbitToken.delete({
        where: { userId: user.id! },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/fitbit/disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Fitbit" },
      { status: 500 }
    );
  }
}
