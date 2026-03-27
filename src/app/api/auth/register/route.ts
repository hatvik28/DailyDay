import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    if (!body || typeof body !== "object") {
      return jsonError("Invalid request body.", 400);
    }

    const { email, name, password } = body as Record<string, unknown>;

    const nameStr = typeof name === "string" ? name.trim() : "";
    const emailStr = typeof email === "string" ? email.trim() : "";
    const passwordStr = typeof password === "string" ? password : "";

    if (!nameStr) {
      return jsonError("Name is required.", 400);
    }
    if (!emailStr) {
      return jsonError("Email is required.", 400);
    }
    if (!EMAIL_REGEX.test(emailStr)) {
      return jsonError("Please enter a valid email address.", 400);
    }
    if (!passwordStr) {
      return jsonError("Password is required.", 400);
    }
    if (passwordStr.length < 6) {
      return jsonError("Password must be at least 6 characters.", 400);
    }

    const passwordHash = await bcrypt.hash(passwordStr, 10);

    const user = await prisma.user.create({
      data: {
        name: nameStr,
        email: emailStr.toLowerCase(),
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("An account with this email already exists.", 409);
    }

    console.error("[POST /api/auth/register]", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
