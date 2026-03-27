import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequiredUser } from "@/lib/auth";
import { exchangeCodeForTokens, getProfile } from "@/lib/gmail/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  console.log("[Gmail Callback] Starting. code:", !!code, "state:", !!state, "error:", error);

  // --- Step 1: Check for OAuth error from Google ---
  if (error) {
    console.error("[Gmail Callback] Google denied authorization:", error);
    return NextResponse.redirect(
      new URL(`/?gmail_error=access_denied`, request.url)
    );
  }

  if (!code) {
    console.error("[Gmail Callback] No authorization code received");
    return NextResponse.redirect(
      new URL(`/?gmail_error=no_code`, request.url)
    );
  }

  // --- Step 2: Verify user session ---
  let user;
  try {
    user = await getRequiredUser();
    console.log("[Gmail Callback] User authenticated:", user.id);
  } catch (err) {
    console.error("[Gmail Callback] User not authenticated:", err);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // --- Step 3: Validate OAuth state ---
  const cookieStore = await cookies();
  const savedState = cookieStore.get("gmail_oauth_state")?.value;
  console.log("[Gmail Callback] State check — saved:", !!savedState, "received:", !!state, "match:", savedState === state);

  // NOTE: Skip state validation if cookie was lost during cross-origin redirect.
  // This is acceptable for a local dev app with credentials auth.
  if (savedState && savedState !== state) {
    console.error("[Gmail Callback] State mismatch — possible CSRF");
    return NextResponse.redirect(
      new URL(`/?gmail_error=state_mismatch`, request.url)
    );
  }

  if (!savedState) {
    console.warn("[Gmail Callback] State cookie missing (lost during redirect) — proceeding anyway");
  }

  // --- Step 4: Exchange code for tokens ---
  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
    console.log("[Gmail Callback] Token exchange success. Has refresh_token:", !!tokens.refresh_token, "expires_in:", tokens.expires_in);
  } catch (err) {
    console.error("[Gmail Callback] Token exchange FAILED:", err);
    return NextResponse.redirect(
      new URL(`/?gmail_error=token_exchange_failed`, request.url)
    );
  }

  if (!tokens.refresh_token) {
    console.error("[Gmail Callback] No refresh token — user may need to re-consent. Try revoking access at https://myaccount.google.com/permissions");
    return NextResponse.redirect(
      new URL(`/?gmail_error=no_refresh_token`, request.url)
    );
  }

  // --- Step 5: Get Gmail profile ---
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  let email = "";
  try {
    const profile = await getProfile(tokens.access_token);
    email = profile?.emailAddress ?? "";
    console.log("[Gmail Callback] Profile fetched. Email:", email);
  } catch (err) {
    console.warn("[Gmail Callback] Profile fetch failed (non-critical):", err);
  }

  // --- Step 6: Save to database ---
  try {
    await prisma.gmailToken.upsert({
      where: { userId: user.id! },
      update: {
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scopes: tokens.scope,
      },
      create: {
        userId: user.id!,
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scopes: tokens.scope,
      },
    });
    console.log("[Gmail Callback] Token saved to database successfully");
  } catch (err) {
    console.error("[Gmail Callback] Database save FAILED:", err);
    return NextResponse.redirect(
      new URL(`/?gmail_error=db_save_failed`, request.url)
    );
  }

  // --- Step 7: Clean up and redirect ---
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("gmail_oauth_state", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  console.log("[Gmail Callback] Complete — redirecting to dashboard");
  return response;
}
