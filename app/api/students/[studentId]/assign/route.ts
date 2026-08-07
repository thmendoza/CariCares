import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ userId: z.string() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!["SCHOOL_ADMIN", "ACADEMIC_COORDINATOR"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await params;
  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  await db.studentTeacher.upsert({
    where: { studentId_userId: { studentId, userId: result.data.userId } },
    create: { studentId, userId: result.data.userId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
