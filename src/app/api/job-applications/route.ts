import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateJobApplication, isValidJobStatus, type JobApplicationInput } from "@/lib/job-applications";

export async function GET(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { userId: user.id! };
    if (status && isValidJobStatus(status)) {
      where.status = status;
    }

    const applications = await prisma.jobApplication.findMany({
      where,
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("GET /api/job-applications error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
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

    let body: JobApplicationInput;
    try {
      body = await request.json() as JobApplicationInput;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const validationError = validateJobApplication(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const application = await prisma.jobApplication.create({
      data: {
        userId: user.id!,
        company: body.company!.trim(),
        role: body.role!.trim(),
        status: body.status ?? "applied",
        url: body.url?.trim() ?? "",
        salaryMin: body.salaryMin ?? null,
        salaryMax: body.salaryMax ?? null,
        location: body.location?.trim() ?? "",
        remote: body.remote ?? false,
        notes: body.notes?.trim() ?? "",
        appliedAt: body.appliedAt ? new Date(body.appliedAt) : new Date(),
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("POST /api/job-applications error:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}
