import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseDocBlocks } from "@/lib/google-docs/blocks";
import { normalizeBlocksToHtml, detectSectionsWithDiagnostics, summarizeSections } from "@/lib/parser";

// Same access rule as /api/google-docs/connect — this route only ever
// operates on blocks the caller already received from that endpoint in
// this same session; it does not re-fetch or re-authorize a document.
const ALLOWED_ROLES = ["TEACHER", "ACADEMIC_COORDINATOR", "SCHOOL_ADMIN", "THERAPIST"];

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  const accountStatus = session?.user?.accountStatus;

  if (!session?.user?.id || accountStatus !== "ACTIVE" || !role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawBlocks = (body as Record<string, unknown> | null)?.blocks;
  if (!Array.isArray(rawBlocks)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Defense in depth — re-validates and re-caps even though this payload
  // just came from our own /connect response moments earlier, since it
  // passed back through the client first.
  const { blocks, truncated: blocksTruncated } = parseDocBlocks(rawBlocks);

  const html = normalizeBlocksToHtml(blocks);
  const { sections, diagnostics } = detectSectionsWithDiagnostics(html);
  const summary = summarizeSections(sections, blocksTruncated);

  // Never log unknown-heading TEXT here (it's a fragment of document
  // content) — counts only, matching the "never log document/section
  // content" rule already in place for this route.
  console.log(
    `[google-docs/parse-sections] detected=${sections.length}/${summary.length} ` +
      `tableHeadingsRecovered=${diagnostics.tableHeadingsRecovered} ` +
      `embeddedTableHeadingsRecovered=${diagnostics.embeddedTableHeadingsRecovered} ` +
      `quarterHeadingsRecovered=${diagnostics.quarterHeadingsRecovered} ` +
      `explicitAliasRecoveries=${diagnostics.explicitAliasRecoveries} ` +
      `secondCellRecoveries=${diagnostics.secondCellRecoveries} ` +
      `unknownHeadings=${diagnostics.unknownHeadings.length} ` +
      `processingTimeMs=${diagnostics.processingTimeMs}`
  );

  // diagnostics is developer-facing only — present in the response payload
  // for inspection, but ParsedSectionsPreview (the teacher-facing component)
  // never reads or renders it.
  return NextResponse.json({ sections: summary, diagnostics }, { status: 200 });
}
