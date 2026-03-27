import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { isValidHexColor, isValidFrequency } from "@/lib/utils";

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

    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== user.id) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, color, frequency, active, categoryId } = body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "Habit name cannot be empty" },
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

    if (active !== undefined && typeof active !== "boolean") {
      return NextResponse.json(
        { error: "Active must be a boolean" },
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

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (color !== undefined) data.color = color;
    if (frequency !== undefined) data.frequency = frequency;
    if (active !== undefined) data.active = active;
    if (categoryId !== undefined) data.categoryId = categoryId;

    const updated = await prisma.habit.update({
      where: { id },
      data,
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/habits/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update habit" },
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

    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== user.id) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    await prisma.habit.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/habits/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete habit" },
      { status: 500 }
    );
  }
}
