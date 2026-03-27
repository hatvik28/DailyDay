import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { isValidPriority, isValidFrequency } from "@/lib/utils";

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
    const existing = await prisma.recurringTask.findFirst({
      where: { id, userId: user.id! },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring task not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, priority, frequency, active, categoryId } = body;

    if (title !== undefined && (!title || typeof title !== "string" || !title.trim())) {
      return NextResponse.json(
        { error: "Task title cannot be empty" },
        { status: 400 }
      );
    }

    if (priority !== undefined && !isValidPriority(priority)) {
      return NextResponse.json(
        { error: "Priority must be low, medium, or high" },
        { status: 400 }
      );
    }

    if (frequency !== undefined && !isValidFrequency(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be daily, weekdays, or weekends" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (frequency !== undefined) data.frequency = frequency;
    if (active !== undefined) data.active = Boolean(active);
    if (categoryId !== undefined) data.categoryId = categoryId;

    const task = await prisma.recurringTask.update({
      where: { id },
      data,
      include: { category: true },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("PUT /api/recurring-tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update recurring task" },
      { status: 500 }
    );
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
    const existing = await prisma.recurringTask.findFirst({
      where: { id, userId: user.id! },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring task not found" },
        { status: 404 }
      );
    }

    await prisma.recurringTask.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/recurring-tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete recurring task" },
      { status: 500 }
    );
  }
}
