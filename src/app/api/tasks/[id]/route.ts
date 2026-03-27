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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        durationMinutes: true,
        timerStatus: true,
        timerStartedAt: true,
        timerEndsAt: true,
        timerOutcome: true,
      },
    });
    if (!task || task.userId !== user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      completed,
      priority,
      position,
      categoryId,
      description,
      durationMinutes,
      timerStatus,
      timerStartedAt,
      timerEndsAt,
      timerOutcome,
      completionNote,
    } = body;

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return NextResponse.json({ error: "Task title cannot be empty" }, { status: 400 });
    }

    if (priority !== undefined && !isValidPriority(priority)) {
      return NextResponse.json(
        { error: "Priority must be low, medium, or high" },
        { status: 400 }
      );
    }

    if (completed !== undefined && typeof completed !== "boolean") {
      return NextResponse.json({ error: "Completed must be a boolean" }, { status: 400 });
    }

    if (position !== undefined && (typeof position !== "number" || position < 0)) {
      return NextResponse.json(
        { error: "Position must be a non-negative number" },
        { status: 400 }
      );
    }

    const timerError = validateTaskTimer({
      durationMinutes:
        durationMinutes !== undefined ? durationMinutes : task.durationMinutes,
      timerStatus: timerStatus !== undefined ? timerStatus : task.timerStatus,
      timerStartedAt:
        timerStartedAt !== undefined ? timerStartedAt : task.timerStartedAt,
      timerEndsAt: timerEndsAt !== undefined ? timerEndsAt : task.timerEndsAt,
      timerOutcome: timerOutcome !== undefined ? timerOutcome : task.timerOutcome,
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

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (completed !== undefined) data.completed = completed;
    if (priority !== undefined) data.priority = priority;
    if (position !== undefined) data.position = position;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (description !== undefined) {
      data.description = typeof description === "string" ? description : "";
    }
    if (durationMinutes !== undefined) {
      data.durationMinutes = normalizeDurationMinutes(durationMinutes);
    }
    if (timerStatus !== undefined) data.timerStatus = normalizeTimerStatus(timerStatus);
    if (timerStartedAt !== undefined) {
      data.timerStartedAt = timerStartedAt ? new Date(timerStartedAt) : null;
    }
    if (timerEndsAt !== undefined) {
      data.timerEndsAt = timerEndsAt ? new Date(timerEndsAt) : null;
    }
    if (timerOutcome !== undefined) {
      data.timerOutcome = normalizeTimerOutcome(timerOutcome);
    }
    if (completionNote !== undefined) {
      data.completionNote = sanitizeCompletionNote(completionNote);
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
      include: {
        category: true,
        subitems: { orderBy: { position: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!task || task.userId !== user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
