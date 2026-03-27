import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";

const DEFAULT_RECURRING_TASKS = [
  { title: "Leetcode", priority: "high", frequency: "daily" },
  { title: "System Design", priority: "high", frequency: "daily" },
  { title: "Coding", priority: "medium", frequency: "daily" },
  { title: "Job Applications", priority: "high", frequency: "weekdays" },
];

export async function POST() {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has recurring tasks
    const existing = await prisma.recurringTask.count({
      where: { userId: user.id! },
    });

    if (existing > 0) {
      return NextResponse.json(
        { message: "Recurring tasks already exist", skipped: true },
        { status: 200 }
      );
    }

    await prisma.recurringTask.createMany({
      data: DEFAULT_RECURRING_TASKS.map((t) => ({
        userId: user.id!,
        title: t.title,
        priority: t.priority,
        frequency: t.frequency,
      })),
    });

    const tasks = await prisma.recurringTask.findMany({
      where: { userId: user.id! },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(tasks, { status: 201 });
  } catch (error) {
    console.error("POST /api/recurring-tasks/seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed recurring tasks" },
      { status: 500 }
    );
  }
}
