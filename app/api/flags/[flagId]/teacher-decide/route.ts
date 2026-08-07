import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Milestone 3 — the TEACHER's own review decision on a flag. Fully separate
// from /api/flags/[flagId]/decide (the coordinator/admin approve/dismiss
// route) — different actor, different fields (teacherDecision/
// teacherEditedText/teacherDecidedAt, never decidedById/decidedAt/status).
// Recording a decision here is a review-tracking action only: it never
// modifies highlightText/suggestedText, never touches the source Google
// Doc, and never changes the flag's own `status` (coordinator gate stays
// exactly as it was).
const VALID_DECISIONS = new Set(["ACCEPTED", "REJECTED", "EDITED"]);
const MAX_EDITED_TEXT_LENGTH = 5000;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await auth();
  const role = session?.user?.role;
  const accountStatus = session?.user?.accountStatus;

  if (!session?.user?.id || accountStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const decision = (body as Record<string, unknown> | null)?.decision;
  if (typeof decision !== "string" || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  let editedText: string | null = null;
  if (decision === "EDITED") {
    const raw = (body as Record<string, unknown>).editedText;
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return NextResponse.json({ error: "Edited text is required" }, { status: 400 });
    }
    if (raw.length > MAX_EDITED_TEXT_LENGTH) {
      return NextResponse.json({ error: "Edited text is too long" }, { status: 400 });
    }
    editedText = raw.trim();
  }
  // Any editedText sent alongside ACCEPTED/REJECTED is intentionally
  // ignored, not an error — never trust the client to have paired fields
  // correctly, but don't reject an otherwise-valid request over it either.

  const flag = await db.aiFlag.findUnique({
    where: { id: params.flagId },
    include: { iep: { select: { studentId: true } } },
  });
  if (!flag) {
    return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  }

  // Teacher must actually be assigned to this student — same access rule
  // already used for uploads (see app/api/upload/route.ts).
  const assignment = await db.studentTeacher.findFirst({
    where: { studentId: flag.iep.studentId, userId: session.user.id },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // The core approval-gate guardrail: a teacher may only decide a flag that
  // is already teacher-visible. PENDING_COORDINATOR and DISMISSED flags are
  // rejected here regardless of anything else the request claims.
  if (flag.status !== "VISIBLE_TO_TEACHER") {
    return NextResponse.json({ error: "This suggestion is not available to decide" }, { status: 403 });
  }

  await db.aiFlag.update({
    where: { id: flag.id },
    data: {
      teacherDecision: decision as "ACCEPTED" | "REJECTED" | "EDITED",
      teacherEditedText: editedText,
      teacherDecidedAt: new Date(),
      // Server-derived from the authenticated session only — never from
      // request body input, so a client can never attribute a decision to
      // a different user.
      teacherDecidedById: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
