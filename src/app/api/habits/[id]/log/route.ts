import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";

export async function POST(
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

    const { id: habitId } = await params;

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== user.id) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const body = await request.json();
    const { date, completed } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "A valid date in YYYY-MM-DD format is required" },
        { status: 400 }
      );
    }

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Completed must be a boolean" },
        { status: 400 }
      );
    }

    const existing = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId, date } },
    });

    if (existing) {
      if (existing.completed === completed) {
        await prisma.habitLog.delete({ where: { id: existing.id } });
        return NextResponse.json(null);
      }

      const updated = await prisma.habitLog.update({
        where: { id: existing.id },
        data: { completed },
      });
      return NextResponse.json(updated);
    }

    const log = await prisma.habitLog.create({
      data: { habitId, date, completed },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("POST /api/habits/[id]/log error:", error);
    return NextResponse.json(
      { error: "Failed to toggle habit log" },
      { status: 500 }
    );
  }
}
