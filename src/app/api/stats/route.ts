import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
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
    const daysParam = searchParams.get("days");
    const validDays = [7, 30, 90];
    const days =
      daysParam && validDays.includes(Number(daysParam))
        ? Number(daysParam)
        : 30;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);
    const startDateKey = formatDateKey(startDate);
    const todayKey = formatDateKey(today);

    const [tasks, habits] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId: user.id!,
          dayEntry: { date: { gte: startDateKey, lte: todayKey } },
        },
        include: { category: true },
      }),
      prisma.habit.findMany({
        where: { userId: user.id! },
        include: {
          logs: {
            where: { completed: true },
            orderBy: { date: "asc" },
          },
        },
      }),
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const taskStats = {
      total: totalTasks,
      completed: completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };

    const habitStats = habits.map((habit) => {
      const logsInPeriod = habit.logs.filter(
        (l) => l.date >= startDateKey && l.date <= todayKey
      );
      const totalDaysInPeriod = days;
      const completedDays = logsInPeriod.length;

      const allDates = habit.logs.map((l) => l.date).sort();

      let currentStreak = 0;
      const cursor = new Date(today);
      while (true) {
        const key = formatDateKey(cursor);
        if (allDates.includes(key)) {
          currentStreak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }

      let longestStreak = 0;
      let streak = 0;
      for (let i = 0; i < allDates.length; i++) {
        if (i === 0) {
          streak = 1;
        } else {
          const prev = new Date(allDates[i - 1]);
          const curr = new Date(allDates[i]);
          const diffMs = curr.getTime() - prev.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          streak = diffDays === 1 ? streak + 1 : 1;
        }
        longestStreak = Math.max(longestStreak, streak);
      }

      return {
        habitId: habit.id,
        habitName: habit.name,
        color: habit.color,
        currentStreak,
        longestStreak,
        completionRate:
          totalDaysInPeriod > 0
            ? Math.round((completedDays / totalDaysInPeriod) * 100)
            : 0,
      };
    });

    const categoryMap = new Map<
      string | null,
      { categoryId: string | null; categoryName: string; color: string; taskCount: number }
    >();
    for (const task of tasks) {
      const catId = task.categoryId;
      const key = catId ?? "__uncategorized__";
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: catId,
          categoryName: task.category?.name ?? "Uncategorized",
          color: task.category?.color ?? "#94a3b8",
          taskCount: 0,
        });
      }
      categoryMap.get(key)!.taskCount++;
    }
    const categoryBreakdown = Array.from(categoryMap.values());

    return NextResponse.json({
      taskStats,
      habitStats,
      categoryBreakdown,
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
