import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/shared/empty-state";
import { StudentCard } from "@/components/iep/student-card";
import { DashboardUpload } from "./dashboard-upload";
import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { groupIepsByStatusBucket } from "@/lib/dashboard-stats";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const role = session!.user.role;
  const displayName = session!.user.name ?? session!.user.email ?? "there";

  const isTeacher = role === "TEACHER";
  const canUpload = ["TEACHER", "ACADEMIC_COORDINATOR", "SCHOOL_ADMIN"].includes(role ?? "");
  const headingLabel = isTeacher ? "Your IEPs" : "All IEPs";

  const [students, allStudents] = await Promise.all([
    isTeacher
      ? db.student.findMany({
          where: { isActive: true, teachers: { some: { userId } } },
          include: {
            ieps: {
              orderBy: [{ schoolYear: "desc" }, { quarter: "desc" }, { version: "desc" }],
              take: 1,
            },
          },
          orderBy: { lastName: "asc" },
        })
      : db.student.findMany({
          where: { isActive: true },
          include: {
            ieps: {
              orderBy: [{ schoolYear: "desc" }, { quarter: "desc" }, { version: "desc" }],
              take: 1,
            },
            teachers: { include: { user: { select: { name: true } } }, take: 1 },
          },
          orderBy: { lastName: "asc" },
        }),
    canUpload
      ? isTeacher
        ? db.student.findMany({
            where: { isActive: true, teachers: { some: { userId } } },
            select: { id: true, firstName: true, lastName: true },
            orderBy: { lastName: "asc" },
          })
        : db.student.findMany({
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true },
            orderBy: { lastName: "asc" },
          })
      : Promise.resolve([]),
  ]);

  const statCounts = groupIepsByStatusBucket(students.map((s) => s.ieps[0]?.status));

  const timelineItems = students
    .filter((s) => s.ieps[0])
    .map((s) => ({
      studentName: `${s.lastName}, ${s.firstName}`,
      status: s.ieps[0].status,
      updatedAt: s.ieps[0].updatedAt,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 6);

  return (
    <div>
      <GreetingHeader name={displayName} />
      <StatCards counts={statCounts} />

      {canUpload ? (
        <DashboardUpload students={allStudents} headingLabel={headingLabel} />
      ) : (
        <h2 className="text-h2 text-foreground mb-4">{headingLabel}</h2>
      )}

      {students.length === 0 ? (
        <EmptyState
          title="No students yet"
          description={
            isTeacher
              ? "You haven't been assigned any students. Contact your coordinator."
              : "No students have been added yet. Add students from the Admin panel."
          }
          mascotScene="hold-folder"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              studentId={student.id}
              firstName={student.firstName}
              lastName={student.lastName}
              program={student.program}
              teacherName={
                (student as typeof student & { teachers?: { user: { name: string | null } }[] })
                  .teachers?.[0]?.user.name
              }
              latestIep={student.ieps[0] ?? null}
            />
          ))}
        </div>
      )}

      <ActivityTimeline items={timelineItems} />
    </div>
  );
}
