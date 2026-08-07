import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ACADEMIC_COORDINATOR" && role !== "SCHOOL_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action: string = body.action;
  if (!["approve", "dismiss"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const newStatus = action === "approve" ? "VISIBLE_TO_TEACHER" : "DISMISSED";

  await db.aiFlag.update({
    where: { id: params.flagId },
    data: {
      status: newStatus,
      decidedById: session!.user.id,
      decidedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
