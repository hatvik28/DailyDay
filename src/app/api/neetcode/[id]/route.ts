import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateNeetcodeProblem, type NeetcodeProblemInput } from "@/lib/neetcode";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    let body: NeetcodeProblemInput;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
      }
      body = parsed as NeetcodeProblemInput;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validationError = validateNeetcodeProblem({
      title: body.title ?? "placeholder",
      ...body,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const existing = await prisma.neetcodeProblem.findFirst({
      where: { id, userId: user.id! },
    });

    if (!existing) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const updated = await prisma.neetcodeProblem.update({
      where: { id },
      data: {
        ...(body.title != null && { title: body.title.trim() }),
        ...(body.url != null && { url: body.url.trim() }),
        ...(body.difficulty != null && { difficulty: body.difficulty }),
        ...(body.topic != null && { topic: body.topic }),
        ...(body.listTag != null && { listTag: body.listTag }),
        ...(body.timeMinutes !== undefined && { timeMinutes: body.timeMinutes }),
        ...(body.notes != null && { notes: body.notes.trim() }),
        ...(body.interviewReady != null && { interviewReady: body.interviewReady }),
      },
      include: { reviews: { orderBy: { reviewNumber: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/neetcode/[id] error:", error);
    return NextResponse.json({ error: "Failed to update problem" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.neetcodeProblem.findFirst({
      where: { id, userId: user.id! },
    });

    if (!existing) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    await prisma.neetcodeProblem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/neetcode/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete problem" }, { status: 500 });
  }
}
