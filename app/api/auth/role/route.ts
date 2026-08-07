import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Role, AdminTitle } from "@/app/generated/prisma/client";

const schema = z
  .object({
    role: z.nativeEnum(Role),
    adminTitle: z.nativeEnum(AdminTitle).optional().nullable(),
  })
  .refine(
    (data) =>
      data.role !== "SCHOOL_ADMIN" || !!data.adminTitle,
    { message: "Admin title required for School Admin role" }
  );

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { role, adminTitle } = result.data;

  // Prevent role re-selection after approval
  const existing = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, accountStatus: true },
  });

  if (existing?.role && existing.accountStatus === "ACTIVE") {
    return NextResponse.json(
      { error: "Role already set on active account" },
      { status: 409 }
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      role,
      adminTitle: role === "SCHOOL_ADMIN" ? adminTitle : null,
      accountStatus: "PENDING_APPROVAL",
    },
  });

  return NextResponse.json({ ok: true });
}
