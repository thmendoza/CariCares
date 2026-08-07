import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { AccountStatus } from "@/app/generated/prisma/client";

const schema = z.object({
  status: z.nativeEnum(AccountStatus),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "SCHOOL_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { status } = result.data;

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      accountStatus: status,
      ...(status === "ACTIVE"
        ? { approvedById: session.user.id, approvedAt: new Date() }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, status: updated.accountStatus });
}
