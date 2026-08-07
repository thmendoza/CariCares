import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const PROGRAM_VALUES = [
  "FULL_INCLUSION_NO_SERVICES",
  "FULL_INCLUSION_SHADOW",
  "PARTIAL_INCLUSION_PULLOUT",
  "PARTIAL_INCLUSION_INTENSIVE",
  "PRE_VOCATIONAL",
  "EARLY_CHILDHOOD",
] as const;

const patchSchema = z.object({
  enrolledGradeLevel: z.string().trim().min(1).max(50).optional(),
  program: z.enum(PROGRAM_VALUES).nullable().optional(),
  subjectLevels: z
    .array(
      z.object({
        subject: z.string().trim().min(1).max(50),
        gradeLevel: z.string().trim().min(1).max(50),
      })
    )
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId } = params;
  const role = session.user.role;

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { teachers: { where: { userId: session.user.id } } },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const isAssignedTeacher = role === "TEACHER" && student.teachers.length > 0;
  if (!["SCHOOL_ADMIN", "ACADEMIC_COORDINATOR"].includes(role ?? "") && !isAssignedTeacher) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }
  const { enrolledGradeLevel, program, subjectLevels } = result.data;

  await db.$transaction(async (tx) => {
    if (enrolledGradeLevel !== undefined) {
      await tx.student.update({ where: { id: studentId }, data: { enrolledGradeLevel } });
    }

    if (program !== undefined) {
      await tx.student.update({
        where: { id: studentId },
        data: program
          ? {
              program,
              programConfidence: "CONFIRMED",
              programConfirmedById: session.user.id,
              programConfirmedAt: new Date(),
            }
          : { program: null, programConfidence: "INFERRED", programConfirmedById: null, programConfirmedAt: null },
      });
    }

    if (subjectLevels !== undefined) {
      // Payload is the full desired set — upsert what's provided, drop what isn't.
      for (const { subject, gradeLevel } of subjectLevels) {
        await tx.studentSubjectLevel.upsert({
          where: { studentId_subject: { studentId, subject } },
          create: { studentId, subject, gradeLevel },
          update: { gradeLevel },
        });
      }
      const keepSubjects = subjectLevels.map((s) => s.subject);
      await tx.studentSubjectLevel.deleteMany({
        where: { studentId, subject: { notIn: keepSubjects } },
      });
    }
  });

  const updated = await db.student.findUnique({
    where: { id: studentId },
    include: { subjectLevels: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { studentId } = params;
  const role = session.user.role;

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { teachers: { where: { userId: session.user.id } } },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Teachers can only delete their assigned students
  if (role === "TEACHER" && student.teachers.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["TEACHER", "ACADEMIC_COORDINATOR", "SCHOOL_ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete — preserves historical data
  await db.student.update({
    where: { id: studentId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
