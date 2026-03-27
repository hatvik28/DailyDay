import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { isValidHexColor } from "@/lib/utils";

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

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.userId !== user.id) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, color } = body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "Category name cannot be empty" },
        { status: 400 }
      );
    }

    if (color !== undefined && !isValidHexColor(color)) {
      return NextResponse.json(
        { error: "Color must be a valid hex color (e.g. #6366f1)" },
        { status: 400 }
      );
    }

    if (name !== undefined && name.trim() !== category.name) {
      const duplicate = await prisma.category.findUnique({
        where: { userId_name: { userId: user.id!, name: name.trim() } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (color !== undefined) data.color = color;

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
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

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.userId !== user.id) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
