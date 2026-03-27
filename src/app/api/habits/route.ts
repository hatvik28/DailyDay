import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { isValidHexColor, isValidFrequency } from "@/lib/utils";

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

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    const habits = await prisma.habit.findMany({
      where: { userId: user.id! },
      include: {
        category: true,
        logs: date ? { where: { date } } : false,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(habits);
  } catch (error) {
    console.error("GET /api/habits error:", error);
    return NextResponse.json(
      { error: "Failed to load habits" },
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
    const { name, color, frequency, categoryId } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Habit name is required" },
        { status: 400 }
      );
    }

    if (color !== undefined && !isValidHexColor(color)) {
      return NextResponse.json(
        { error: "Color must be a valid hex color (e.g. #6366f1)" },
        { status: 400 }
      );
    }

    if (frequency !== undefined && !isValidFrequency(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be daily, weekdays, or weekly" },
        { status: 400 }
      );
    }

    if (categoryId !== undefined && categoryId !== null) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: user.id! },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
    }

    const habit = await prisma.habit.create({
      data: {
        userId: user.id!,
        name: name.trim(),
        color: color ?? "#6366f1",
        frequency: frequency ?? "daily",
        categoryId: categoryId ?? null,
      },
      include: { category: true },
    });

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    console.error("POST /api/habits error:", error);
    return NextResponse.json(
      { error: "Failed to create habit" },
      { status: 500 }
    );
  }
}
