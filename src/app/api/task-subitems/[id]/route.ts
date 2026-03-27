import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";

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
    const subitem = await prisma.taskSubitem.findUnique({
      where: { id },
      include: { task: { select: { userId: true } } },
    });

    if (!subitem || subitem.task.userId !== user.id) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "Subtask title cannot be empty" }, { status: 400 });
      }
      data.title = body.title.trim();
    }

    if (body.completed !== undefined) {
      if (typeof body.completed !== "boolean") {
        return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
      }
      data.completed = body.completed;
    }

    const updated = await prisma.taskSubitem.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/task-subitems/[id] error:", error);
    return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
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
    const subitem = await prisma.taskSubitem.findUnique({
      where: { id },
      include: { task: { select: { userId: true } } },
    });

    if (!subitem || subitem.task.userId !== user.id) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    await prisma.taskSubitem.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/task-subitems/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
  }
}
