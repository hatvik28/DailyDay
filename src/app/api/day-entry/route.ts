import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { parseDateKey } from "@/lib/utils";

function shouldRunOnDate(frequency: string, date: Date): boolean {
  const day = date.getDay(); // 0=Sun, 6=Sat
  switch (frequency) {
    case "daily":
      return true;
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekends":
      return day === 0 || day === 6;
    default:
      return true;
  }
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
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "A valid date in YYYY-MM-DD format is required" },
        { status: 400 }
      );
    }

    let entry = await prisma.dayEntry.findUnique({
      where: { userId_date: { userId: user.id!, date } },
      include: {
        tasks: {
          orderBy: { position: "asc" },
          include: {
            category: true,
            subitems: { orderBy: { position: "asc" } },
          },
        },
      },
    });

    if (!entry) {
      entry = await prisma.dayEntry.create({
        data: { userId: user.id!, date },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              category: true,
              subitems: { orderBy: { position: "asc" } },
            },
          },
        },
      });
    }

    // Auto-create tasks from recurring templates if none exist yet for this day
    const hasRecurringTasks = entry.tasks.some(
      (t) => t.description.startsWith("[recurring]")
    );

    if (!hasRecurringTasks) {
      const recurringTasks = await prisma.recurringTask.findMany({
        where: { userId: user.id!, active: true },
      });

      const dateObj = parseDateKey(date);
      const tasksToCreate = recurringTasks.filter((rt) =>
        shouldRunOnDate(rt.frequency, dateObj)
      );

      if (tasksToCreate.length > 0) {
        const existingCount = entry.tasks.length;

        await prisma.task.createMany({
          data: tasksToCreate.map((rt, i) => ({
            userId: user.id!,
            dayEntryId: entry!.id,
            title: rt.title,
            description: `[recurring]${rt.description}`,
            priority: rt.priority,
            position: existingCount + i,
            categoryId: rt.categoryId,
          })),
        });

        // Re-fetch with the new tasks
        entry = await prisma.dayEntry.findUnique({
          where: { id: entry.id },
          include: {
            tasks: {
              orderBy: { position: "asc" },
              include: {
                category: true,
                subitems: { orderBy: { position: "asc" } },
              },
            },
          },
        });
      }
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("GET /api/day-entry error:", error);
    return NextResponse.json(
      { error: "Failed to load day entry" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, journalText } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "A valid date in YYYY-MM-DD format is required" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (journalText !== undefined) data.journalText = journalText;

    const entry = await prisma.dayEntry.upsert({
      where: { userId_date: { userId: user.id!, date } },
      update: data,
      create: { userId: user.id!, date, ...data },
      include: {
        tasks: {
          orderBy: { position: "asc" },
          include: {
            category: true,
            subitems: { orderBy: { position: "asc" } },
          },
        },
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("PUT /api/day-entry error:", error);
    return NextResponse.json(
      { error: "Failed to update day entry" },
      { status: 500 }
    );
  }
}
