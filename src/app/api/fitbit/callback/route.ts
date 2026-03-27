import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequiredUser } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/fitbit";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Fitbit authorization denied:", error);
      return NextResponse.redirect(
        new URL("/health?error=access_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/health?error=no_code", request.url)
      );
    }

    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get("fitbit_code_verifier")?.value;
    const savedState = cookieStore.get("fitbit_oauth_state")?.value;

    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL("/health?error=session_expired", request.url)
      );
    }

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL("/health?error=state_mismatch", request.url)
      );
    }

    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.fitbitToken.upsert({
      where: { userId: user.id! },
      update: {
        fitbitUserId: tokens.user_id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scopes: tokens.scope,
      },
      create: {
        userId: user.id!,
        fitbitUserId: tokens.user_id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scopes: tokens.scope,
      },
    });

    const response = NextResponse.redirect(new URL("/health", request.url));

    response.cookies.set("fitbit_code_verifier", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    response.cookies.set("fitbit_oauth_state", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("GET /api/fitbit/callback error:", error);
    return NextResponse.redirect(
      new URL("/health?error=token_exchange_failed", request.url)
    );
  }
}
