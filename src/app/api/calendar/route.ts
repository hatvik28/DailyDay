import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { NextResponse } from "next/server";

type CalendarDayPayload = {
  taskCount: number;
  completedTaskCount: number;
  habitsDone: number;
  habitsTotal: number;
  hasJournal: boolean;
  completedTasks: { id: string; title: string; completionNote: string | null }[];
};

export async function GET(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "A valid month in YYYY-MM format is required" },
        { status: 400 }
      );
    }

    const userId = user.id!;

    const [habitsTotal, dayEntries, habitLogs] = await Promise.all([
      prisma.habit.count({
        where: { userId, active: true },
      }),
      prisma.dayEntry.findMany({
        where: {
          userId,
          date: { startsWith: month },
        },
        include: {
          tasks: {
            select: {
              id: true,
              completed: true,
              title: true,
              completionNote: true,
            },
          },
        },
      }),
      prisma.habitLog.findMany({
        where: {
          date: { startsWith: month },
          completed: true,
          habit: { userId, active: true },
        },
        select: { date: true },
      }),
    ]);

    const habitsDoneByDate = new Map<string, number>();
    for (const log of habitLogs) {
      habitsDoneByDate.set(
        log.date,
        (habitsDoneByDate.get(log.date) ?? 0) + 1
      );
    }

    const days: Record<string, CalendarDayPayload> = {};

    for (const entry of dayEntries) {
      const completedTaskCount = entry.tasks.filter((t) => t.completed).length;
      days[entry.date] = {
        taskCount: entry.tasks.length,
        completedTaskCount,
        habitsDone: habitsDoneByDate.get(entry.date) ?? 0,
        habitsTotal,
        hasJournal: entry.journalText.trim().length > 0,
        completedTasks: entry.tasks
          .filter((task) => task.completed)
          .map((task) => ({
            id: task.id,
            title: task.title,
            completionNote: task.completionNote,
          })),
      };
    }

    for (const [date, habitsDone] of habitsDoneByDate) {
      if (!days[date]) {
        days[date] = {
          taskCount: 0,
          completedTaskCount: 0,
          habitsDone,
          habitsTotal,
          hasJournal: false,
          completedTasks: [],
        };
      }
    }

    return NextResponse.json({ days });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json(
      { error: "Failed to load calendar data" },
      { status: 500 }
    );
  }
}
