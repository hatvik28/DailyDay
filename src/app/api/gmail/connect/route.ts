import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRequiredUser } from "@/lib/auth";
import { getGmailAuthorizationUrl } from "@/lib/gmail/client";

export async function GET() {
  try {
    try {
      await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = crypto.randomBytes(16).toString("hex");
    const url = getGmailAuthorizationUrl(state);

    const response = NextResponse.redirect(url);

    response.cookies.set("gmail_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error("GET /api/gmail/connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Gmail connection" },
      { status: 500 }
    );
  }
}
