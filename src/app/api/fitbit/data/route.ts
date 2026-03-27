import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFitbitHealthData, refreshAccessToken } from "@/lib/fitbit";
import { formatDateKey } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : formatDateKey(new Date());

    const fitbitToken = await prisma.fitbitToken.findUnique({
      where: { userId: user.id! },
    });

    if (!fitbitToken) {
      return NextResponse.json({ connected: false });
    }

    let { accessToken } = fitbitToken;

    // Refresh token if expired (with 5 minute buffer)
    if (fitbitToken.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      try {
        const refreshed = await refreshAccessToken(fitbitToken.refreshToken);
        accessToken = refreshed.access_token;
        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

        await prisma.fitbitToken.update({
          where: { userId: user.id! },
          data: {
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            expiresAt,
            scopes: refreshed.scope,
          },
        });
      } catch (refreshError) {
        console.error("Fitbit token refresh failed:", refreshError);
        // Token is invalid; delete it so user can reconnect
        await prisma.fitbitToken.delete({
          where: { userId: user.id! },
        });
        return NextResponse.json({
          connected: false,
          error: "Fitbit session expired. Please reconnect.",
        });
      }
    }

    try {
      const data = await getFitbitHealthData(accessToken, date);
      return NextResponse.json({ connected: true, date, ...data });
    } catch (error) {
      if (error instanceof Error && error.message === "FITBIT_TOKEN_EXPIRED") {
        // Token expired mid-request; try one refresh
        try {
          const refreshed = await refreshAccessToken(fitbitToken.refreshToken);
          const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
          await prisma.fitbitToken.update({
            where: { userId: user.id! },
            data: {
              accessToken: refreshed.access_token,
              refreshToken: refreshed.refresh_token,
              expiresAt,
            },
          });
          const data = await getFitbitHealthData(refreshed.access_token, date);
          return NextResponse.json({ connected: true, date, ...data });
        } catch {
          await prisma.fitbitToken.delete({ where: { userId: user.id! } });
          return NextResponse.json({
            connected: false,
            error: "Fitbit session expired. Please reconnect.",
          });
        }
      }

      console.error("Fitbit data fetch failed:", error);
      return NextResponse.json({
        connected: true,
        date,
        activity: null,
        heartRate: null,
        sleep: null,
        weight: null,
        error:
          error instanceof Error && error.message
            ? error.message
            : "Fitbit data is temporarily unavailable.",
      });
    }
  } catch (error) {
    console.error("GET /api/fitbit/data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Fitbit data" },
      { status: 500 }
    );
  }
}
