import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isValidGoogleDocsUrl,
  readGoogleDoc,
  mapBridgeErrorCode,
  MAX_DOC_URL_LENGTH,
} from "@/lib/google-docs-bridge";

const ALLOWED_ROLES = ["TEACHER", "ACADEMIC_COORDINATOR", "SCHOOL_ADMIN", "THERAPIST"];

// Codes that mean "something on our/Apps Script's side isn't working or
// isn't set up" — surfaced as 502. Everything else means "this specific
// document doesn't qualify" — surfaced as 400.
const SERVER_SIDE_CODES = new Set([
  "BRIDGE_UNAVAILABLE",
  "BRIDGE_NOT_CONFIGURED",
  "APPROVED_FOLDER_NOT_FOUND",
  "FOLDER_ACCESS_DENIED",
  "FOLDER_VALIDATION_FAILED",
  "UNAUTHORIZED",
  "INTERNAL_ERROR",
]);

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

  const documentUrl = (body as Record<string, unknown> | null)?.documentUrl;

  if (typeof documentUrl === "string" && documentUrl.length > MAX_DOC_URL_LENGTH) {
    return NextResponse.json({ error: "Document URL is too long" }, { status: 400 });
  }

  if (!isValidGoogleDocsUrl(documentUrl)) {
    return NextResponse.json({ error: mapBridgeErrorCode("INVALID_DOCUMENT_URL") }, { status: 400 });
  }

  const result = await readGoogleDoc(documentUrl);

  // Never log `result` here — a success result carries document content.
  if (!result.success) {
    console.warn(`[google-docs/connect] bridge returned error code: ${result.error.code}`);
    const status = SERVER_SIDE_CODES.has(result.error.code) ? 502 : 400;
    return NextResponse.json(
      { error: mapBridgeErrorCode(result.error.code), code: result.error.code },
      { status }
    );
  }

  return NextResponse.json({ document: result.document }, { status: 200 });
}
