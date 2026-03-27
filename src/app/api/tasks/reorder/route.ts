import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";
import { buildTaskPositionUpdates } from "@/lib/tasks";

export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const taskIds = Array.isArray(body.taskIds) ? body.taskIds : null;

    if (!taskIds || taskIds.some((taskId: unknown) => typeof taskId !== "string")) {
      return NextResponse.json(
        { error: "taskIds must be an array of task ids" },
        { status: 400 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id!,
        id: { in: taskIds },
      },
      select: {
        id: true,
        dayEntryId: true,
        position: true,
      },
    });

    if (tasks.length !== taskIds.length) {
      return NextResponse.json({ error: "Some tasks were not found" }, { status: 404 });
    }

    const dayEntryIds = new Set(tasks.map((task) => task.dayEntryId));
    if (dayEntryIds.size !== 1) {
      return NextResponse.json(
        { error: "Tasks must belong to the same day before reordering" },
        { status: 400 }
      );
    }

    const updates = buildTaskPositionUpdates(taskIds, tasks);
    if (!updates) {
      return NextResponse.json(
        { error: "taskIds must include each task exactly once" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      updates.map((update) =>
        prisma.task.update({
          where: { id: update.id },
          data: { position: update.position },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/tasks/reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 });
  }
}
