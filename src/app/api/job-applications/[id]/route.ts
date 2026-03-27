import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateJobApplication } from "@/lib/job-applications";

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
    const body = await request.json();
    const validationError = validateJobApplication({
      company: body.company ?? "placeholder",
      role: body.role ?? "placeholder",
      ...body,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id! },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: {
        ...(body.company != null && { company: body.company.trim() }),
        ...(body.role != null && { role: body.role.trim() }),
        ...(body.status != null && { status: body.status }),
        ...(body.url != null && { url: body.url.trim() }),
        ...(body.salaryMin !== undefined && { salaryMin: body.salaryMin }),
        ...(body.salaryMax !== undefined && { salaryMax: body.salaryMax }),
        ...(body.location != null && { location: body.location.trim() }),
        ...(body.remote != null && { remote: body.remote }),
        ...(body.notes != null && { notes: body.notes.trim() }),
        ...(body.respondedAt != null && { respondedAt: new Date(body.respondedAt) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/job-applications/[id] error:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
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

    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id! },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    await prisma.jobApplication.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/job-applications/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
