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

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!task || task.userId !== user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Subtask title is required" }, { status: 400 });
    }

    const existingCount = await prisma.taskSubitem.count({
      where: { taskId: task.id },
    });

    const subitem = await prisma.taskSubitem.create({
      data: {
        taskId: task.id,
        title,
        position: existingCount,
      },
    });

    return NextResponse.json(subitem, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/subitems error:", error);
    return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
  }
}
