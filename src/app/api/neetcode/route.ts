import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  validateNeetcodeProblem,
  isValidDifficulty,
  isValidTopic,
  isValidListTag,
  type NeetcodeProblemInput,
} from "@/lib/neetcode";

export async function GET(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const topic = searchParams.get("topic");
    const listTag = searchParams.get("listTag");

    const where: Record<string, unknown> = { userId: user.id! };
    if (difficulty && isValidDifficulty(difficulty)) {
      where.difficulty = difficulty;
    }
    if (topic && isValidTopic(topic)) {
      where.topic = topic;
    }
    if (listTag && isValidListTag(listTag)) {
      where.listTag = listTag;
    }

    const problems = await prisma.neetcodeProblem.findMany({
      where,
      include: { reviews: { orderBy: { reviewNumber: "asc" } } },
      orderBy: { solvedAt: "desc" },
    });

    return NextResponse.json(problems);
  } catch (error) {
    console.error("GET /api/neetcode error:", error);
    return NextResponse.json({ error: "Failed to fetch problems" }, { status: 500 });
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

    let body: NeetcodeProblemInput;
    try {
      body = (await request.json()) as NeetcodeProblemInput;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validationError = validateNeetcodeProblem(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const problem = await prisma.neetcodeProblem.create({
      data: {
        userId: user.id!,
        title: body.title!.trim(),
        url: body.url?.trim() ?? "",
        difficulty: body.difficulty ?? "medium",
        topic: body.topic ?? "arrays_hashing",
        listTag: body.listTag ?? "neetcode_150",
        timeMinutes: body.timeMinutes ?? null,
        notes: body.notes?.trim() ?? "",
        interviewReady: body.interviewReady ?? false,
        solvedAt: body.solvedAt ? new Date(body.solvedAt) : new Date(),
      },
      include: { reviews: true },
    });

    return NextResponse.json(problem, { status: 201 });
  } catch (error) {
    console.error("POST /api/neetcode error:", error);
    return NextResponse.json({ error: "Failed to create problem" }, { status: 500 });
  }
}
