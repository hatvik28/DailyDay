import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { isValidPriority, isValidFrequency } from "@/lib/utils";

export async function GET() {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await prisma.recurringTask.findMany({
      where: { userId: user.id! },
      orderBy: { createdAt: "asc" },
      include: { category: true },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/recurring-tasks error:", error);
    return NextResponse.json(
      { error: "Failed to load recurring tasks" },
      { status: 500 }
    );
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
    const { title, description, priority, frequency, categoryId } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Task title is required" },
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

    const task = await prisma.recurringTask.create({
      data: {
        userId: user.id!,
        title: title.trim(),
        description: description ?? "",
        priority: priority ?? "medium",
        frequency: frequency ?? "daily",
        categoryId: categoryId ?? null,
      },
      include: { category: true },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring-tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create recurring task" },
      { status: 500 }
    );
  }
}
