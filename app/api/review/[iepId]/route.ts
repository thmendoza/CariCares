import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { runIepReview } from "@/lib/ai/review-orchestrator";

export async function POST(
  req: NextRequest,
  { params }: { params: { iepId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!role || !["ACADEMIC_COORDINATOR", "SCHOOL_ADMIN", "TEACHER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { iepId } = params;

  const iep = await db.iep.findUnique({
    where: { id: iepId },
    select: { id: true, status: true, _count: { select: { sections: true } } },
  });
  if (!iep) return NextResponse.json({ error: "IEP not found" }, { status: 404 });
  if (iep._count.sections === 0)
    return NextResponse.json(
      { error: "IEP has no parsed sections yet" },
      { status: 400 }
    );

  try {
    await runIepReview(iepId);
  } catch (err) {
    console.error("[review] Failed:", err);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
