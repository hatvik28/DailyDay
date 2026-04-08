import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  validateReviewInput,
  computeNextInterval,
  computeNextReviewDate,
  type ReviewInput,
  type ReviewQuality,
} from "@/lib/neetcode";

export async function POST(
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

    let body: ReviewInput;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
      }
      body = parsed as ReviewInput;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validationError = validateReviewInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Use a transaction to prevent duplicate reviewNumber from concurrent requests
    const review = await prisma.$transaction(async (tx) => {
      // Verify the problem exists and belongs to this user
      const problem = await tx.neetcodeProblem.findFirst({
        where: { id, userId: user.id! },
        include: { reviews: { orderBy: { reviewNumber: "desc" }, take: 1 } },
      });

      if (!problem) {
        return null;
      }

      // Determine review number (last review number + 1, or 1 if first review)
      const lastReviewNumber = problem.reviews[0]?.reviewNumber ?? 0;
      const reviewNumber = lastReviewNumber + 1;

      // Calculate spaced repetition interval
      const quality = body.quality as ReviewQuality;
      const intervalDays = computeNextInterval(reviewNumber, quality);
      const now = new Date();
      const nextReviewAt = computeNextReviewDate(now, intervalDays);

      return tx.neetcodeReview.create({
        data: {
          problemId: id,
          reviewNumber,
          quality,
          intervalDays,
          nextReviewAt,
          timeMinutes: body.timeMinutes ?? null,
          notes: body.notes?.trim() ?? "",
        },
      });
    });

    if (!review) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("POST /api/neetcode/[id]/review error:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
