import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRequiredUser } from "@/lib/auth";
import { generatePKCE, getAuthorizationUrl } from "@/lib/fitbit";

export async function GET() {
  try {
    try {
      await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    const url = getAuthorizationUrl(codeChallenge, state);

    const response = NextResponse.redirect(url);

    // Store code_verifier and state in HTTP-only cookies (10 min TTL)
    response.cookies.set("fitbit_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("fitbit_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error("GET /api/fitbit/connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Fitbit connection" },
      { status: 500 }
    );
  }
}
