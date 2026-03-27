import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredUser } from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    let user;
    try {
      user = await getRequiredUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, journalText } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "A valid date in YYYY-MM-DD format is required" },
        { status: 400 }
      );
    }

    if (typeof journalText !== "string") {
      return NextResponse.json(
        { error: "Journal text must be a string" },
        { status: 400 }
      );
    }

    const entry = await prisma.dayEntry.upsert({
      where: { userId_date: { userId: user.id!, date } },
      update: { journalText },
      create: { userId: user.id!, date, journalText },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("PUT /api/journal error:", error);
    return NextResponse.json(
      { error: "Failed to update journal" },
      { status: 500 }
    );
  }
}
