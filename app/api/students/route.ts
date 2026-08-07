import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  therapistStatus: z.enum(["NONE", "IN_HOUSE", "EXTERNAL"]).default("NONE"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  const students =
    role === "TEACHER"
      ? await db.student.findMany({
          where: { isActive: true, teachers: { some: { userId } } },
          orderBy: { lastName: "asc" },
        })
      : await db.student.findMany({
          where: { isActive: true },
          orderBy: { lastName: "asc" },
        });

  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["SCHOOL_ADMIN", "ACADEMIC_COORDINATOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { firstName, lastName, dateOfBirth, therapistStatus } = result.data;

  const student = await db.student.create({
    data: {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      therapistStatus,
    },
  });

  return NextResponse.json(student, { status: 201 });
}
