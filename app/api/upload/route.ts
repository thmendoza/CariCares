import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, buildStorageKey } from "@/lib/storage";
import { docxToHtml, detectSectionsWithDiagnostics, EXPECTED_SECTION_TYPES } from "@/lib/parser";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const studentId = formData.get("studentId") as string | null;
  const schoolYear = formData.get("schoolYear") as string | null;
  const quarter = Number(formData.get("quarter"));

  if (!file || !studentId || !schoolYear || !quarter) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!file.name.endsWith(".docx")) {
    return NextResponse.json({ error: "Only .docx files are accepted" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  // Verify student exists and teacher has access
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { teachers: { where: { userId: session.user.id } } },
  });

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const isTeacher = session.user.role === "TEACHER";
  if (isTeacher && student.teachers.length === 0) {
    return NextResponse.json({ error: "You are not assigned to this student" }, { status: 403 });
  }

  // Determine next version number
  const lastIep = await db.iep.findFirst({
    where: { studentId, schoolYear, quarter },
    orderBy: { version: "desc" },
  });
  const version = (lastIep?.version ?? 0) + 1;

  // Upload file to Cloudflare R2
  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = buildStorageKey(studentId, schoolYear, quarter, version, file.name);
  await uploadFile(storageKey, buffer, file.type);

  // Create IEP record
  const iep = await db.iep.create({
    data: {
      studentId,
      schoolYear,
      quarter,
      version,
      status: "SUBMITTED",
      storageKey,
      uploadedById: session.user.id,
    },
  });

  // Log upload action
  await db.actionHistory.create({
    data: {
      iepId: iep.id,
      actorId: session.user.id,
      actionType: "UPLOAD",
      metadata: { filename: file.name, version, quarter, schoolYear },
    },
  });

  // Parse document and create IepSection records
  try {
    const html = await docxToHtml(buffer);
    const { sections, diagnostics } = detectSectionsWithDiagnostics(html);

    await Promise.all(
      sections.map((sec) =>
        db.iepSection.create({
          data: {
            iepId: iep.id,
            sectionType: sec.sectionType,
            order: sec.order,
            title: sec.title,
            rawHtml: sec.rawHtml,
            plainText: sec.plainText,
            contentHash: sec.contentHash,
            changedFromPrevVersion: false,
          },
        })
      )
    );

    await db.iep.update({
      where: { id: iep.id },
      data: { status: "IN_REVIEW" },
    });

    const detectedTypes = new Set(sections.map((s) => s.sectionType));
    const missingSections = EXPECTED_SECTION_TYPES.filter((t) => !detectedTypes.has(t));
    if (missingSections.length > 0) {
      console.warn(
        `[upload] IEP ${iep.id} parsed with missing sections:`,
        missingSections.join(", ")
      );
    }

    // Same diagnostics instrumentation as the Google Docs path — counts
    // only, never the unknown-heading text itself (document content).
    console.log(
      `[upload] IEP ${iep.id} detected=${sections.length}/${EXPECTED_SECTION_TYPES.length} ` +
        `tableHeadingsRecovered=${diagnostics.tableHeadingsRecovered} ` +
        `embeddedTableHeadingsRecovered=${diagnostics.embeddedTableHeadingsRecovered} ` +
        `quarterHeadingsRecovered=${diagnostics.quarterHeadingsRecovered} ` +
        `explicitAliasRecoveries=${diagnostics.explicitAliasRecoveries} ` +
        `secondCellRecoveries=${diagnostics.secondCellRecoveries} ` +
        `unknownHeadings=${diagnostics.unknownHeadings.length} ` +
        `processingTimeMs=${diagnostics.processingTimeMs}`
    );

    await db.actionHistory.create({
      data: {
        iepId: iep.id,
        actorId: session.user.id,
        actionType: "PARSE_COMPLETE",
        metadata: { sectionCount: sections.length, missingSections },
      },
    });
  } catch (err) {
    console.error("[upload] Parse failed for iep", iep.id, err);
    // IEP record already exists — return success anyway
  }

  return NextResponse.json({ iepId: iep.id }, { status: 201 });
}
