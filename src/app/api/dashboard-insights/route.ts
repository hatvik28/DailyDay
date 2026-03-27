import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { buildHeatmapCells, buildHealthSummaries, type FitbitTrendDay } from "@/lib/dashboard";
import { refreshAccessToken } from "@/lib/fitbit";
import { getCachedFitbitDay } from "@/lib/fitbit-cache";
import { prisma } from "@/lib/prisma";
import { formatDateKey, parseDateKey } from "@/lib/utils";

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

async function getActiveAccessToken(userId: string) {
  const fitbitToken = await prisma.fitbitToken.findUnique({
    where: { userId },
  });

  if (!fitbitToken) return null;

  if (fitbitToken.expiresAt.getTime() >= Date.now() + 5 * 60 * 1000) {
    return fitbitToken.accessToken;
  }

  const refreshed = await refreshAccessToken(fitbitToken.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await prisma.fitbitToken.update({
    where: { userId },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt,
      scopes: refreshed.scope,
    },
  });

  return refreshed.access_token;
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
    const dateParam = searchParams.get("date");
    const endDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? parseDateKey(dateParam)
        : parseDateKey(formatDateKey(new Date()));

    const heatmapStart = formatDateKey(addDays(endDate, -83));
    const heatmapEnd = formatDateKey(endDate);

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id!,
        dayEntry: {
          date: {
            gte: heatmapStart,
            lte: heatmapEnd,
          },
        },
      },
      select: {
        completed: true,
        dayEntry: {
          select: {
            date: true,
          },
        },
      },
    });

    const taskMap = new Map<string, { date: string; totalTasks: number; completedTasks: number }>();
    for (const task of tasks) {
      const key = task.dayEntry.date;
      const existing = taskMap.get(key) ?? {
        date: key,
        totalTasks: 0,
        completedTasks: 0,
      };
      existing.totalTasks += 1;
      existing.completedTasks += task.completed ? 1 : 0;
      taskMap.set(key, existing);
    }

    const heatmap = buildHeatmapCells(Array.from(taskMap.values()), 84, endDate);

    let health = {
      connected: false,
      summaries: [] as ReturnType<typeof buildHealthSummaries>,
      error: null as string | null,
    };

    try {
      const accessToken = await getActiveAccessToken(user.id!);

      if (accessToken) {
        const trendDates = Array.from({ length: 7 }, (_, index) =>
          formatDateKey(addDays(endDate, -(6 - index)))
        );

        const trendRows = await Promise.all(
          trendDates.map(async (date) => {
            const metrics = await getCachedFitbitDay(user.id!, accessToken, date);
            const row: FitbitTrendDay = {
              date,
              steps: metrics.activity?.steps ?? null,
              stepGoal: metrics.activity?.goals.steps ?? null,
              sleepMinutes: metrics.sleep?.totalMinutesAsleep ?? null,
              activeMinutes: metrics.activity
                ? metrics.activity.lightlyActiveMinutes +
                  metrics.activity.fairlyActiveMinutes +
                  metrics.activity.veryActiveMinutes
                : null,
              restingHeartRate: metrics.heartRate?.restingHeartRate ?? null,
            };
            return row;
          })
        );

        health = {
          connected: true,
          summaries: buildHealthSummaries(trendRows),
          error: null,
        };
      }
    } catch (error) {
      console.error("GET /api/dashboard-insights health aggregation error:", error);
      health = {
        connected: false,
        summaries: [],
        error: "Health summaries are unavailable right now.",
      };
    }

    return NextResponse.json({
      heatmap,
      health,
    });
  } catch (error) {
    console.error("GET /api/dashboard-insights error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard insights" },
      { status: 500 }
    );
  }
}
