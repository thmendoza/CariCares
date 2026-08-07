import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { iepId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { iepId } = params;
  const role = session.user.role;

  const iep = await db.iep.findUnique({
    where: { id: iepId },
    select: { id: true, storageKey: true, uploadedById: true },
  });

  if (!iep) {
    return NextResponse.json({ error: "IEP not found" }, { status: 404 });
  }

  // Teachers can only delete IEPs they uploaded
  if (role === "TEACHER" && iep.uploadedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["TEACHER", "ACADEMIC_COORDINATOR", "SCHOOL_ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete from R2 (non-fatal if file already gone)
  try {
    await deleteFile(iep.storageKey);
  } catch {
    // continue — DB record must still be removed
  }

  // Cascade delete: sections, flags, comments, history all cascade via schema
  await db.iep.delete({ where: { id: iepId } });

  return NextResponse.json({ ok: true });
}
