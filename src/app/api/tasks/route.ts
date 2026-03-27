import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { isValidPriority } from "@/lib/utils";
import {
  normalizeDurationMinutes,
  normalizeTimerOutcome,
  normalizeTimerStatus,
  sanitizeCompletionNote,
  validateTaskTimer,
} from "@/lib/tasks";

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

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id!,
        dayEntry: { date },
      },
      orderBy: { position: "asc" },
      include: {
        category: true,
        subitems: { orderBy: { position: "asc" } },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      date,
      title,
      priority,
      categoryId,
      description,
      durationMinutes,
      timerStatus,
      timerStartedAt,
      timerEndsAt,
      timerOutcome,
      completionNote,
    } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "A valid date in YYYY-MM-DD format is required" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    if (priority !== undefined && !isValidPriority(priority)) {
      return NextResponse.json(
        { error: "Priority must be low, medium, or high" },
        { status: 400 }
      );
    }

    const timerError = validateTaskTimer({
      durationMinutes,
      timerStatus,
      timerStartedAt,
      timerEndsAt,
      timerOutcome,
    });
    if (timerError) {
      return NextResponse.json({ error: timerError }, { status: 400 });
    }

    if (categoryId !== undefined && categoryId !== null) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: user.id! },
      });
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }

    const dayEntry = await prisma.dayEntry.upsert({
      where: { userId_date: { userId: user.id!, date } },
      update: {},
      create: { userId: user.id!, date },
    });

    const existingCount = await prisma.task.count({
      where: { dayEntryId: dayEntry.id },
    });

    const task = await prisma.task.create({
      data: {
        userId: user.id!,
        dayEntryId: dayEntry.id,
        title: title.trim(),
        description: typeof description === "string" ? description : "",
        priority: priority ?? "medium",
        position: existingCount,
        categoryId: categoryId ?? null,
        durationMinutes: normalizeDurationMinutes(durationMinutes),
        timerStatus: normalizeTimerStatus(timerStatus),
        timerStartedAt: timerStartedAt ? new Date(timerStartedAt) : null,
        timerEndsAt: timerEndsAt ? new Date(timerEndsAt) : null,
        timerOutcome: normalizeTimerOutcome(timerOutcome),
        completionNote: sanitizeCompletionNote(completionNote),
      },
      include: {
        category: true,
        subitems: { orderBy: { position: "asc" } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
