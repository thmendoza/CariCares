import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/shared/empty-state";
import { FlagCardClient } from "./flag-card-client";

export default async function CoordinatorQueuePage() {
  const session = await auth();
  if (
    session?.user?.role !== "ACADEMIC_COORDINATOR" &&
    session?.user?.role !== "SCHOOL_ADMIN"
  ) {
    redirect("/dashboard");
  }

  const flaggedIeps = await db.iep.findMany({
    where: { aiFlags: { some: { status: "PENDING_COORDINATOR" } } },
    include: {
      student: { select: { firstName: true, lastName: true } },
      aiFlags: {
        where: { status: "PENDING_COORDINATOR" },
        orderBy: { createdAt: "asc" },
      },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-h1 text-foreground mb-6">Review Queue</h1>

      {flaggedIeps.length === 0 ? (
        <EmptyState
          title="You're all caught up!"
          description="No flags pending review right now."
          mascotScene="celebrate"
        />
      ) : (
        <div className="space-y-6">
          {flaggedIeps.map((iep) => (
            <div
              key={iep.id}
              className="paper overflow-hidden"
            >
              {/* IEP header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <Link
                    href={`/students/${iep.studentId}/iep/${iep.id}/review`}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {iep.student.lastName}, {iep.student.firstName}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {iep.schoolYear} · Q{iep.quarter} · v{iep.version}
                    {iep.uploadedBy?.name ? ` · ${iep.uploadedBy.name}` : ""}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-care-red-light text-[#A8402C]">
                  {iep.aiFlags.length} flag{iep.aiFlags.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Flags */}
              <div className="p-4 space-y-3">
                {iep.aiFlags.map((flag) => (
                  <FlagCardClient key={flag.id} flag={flag} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
