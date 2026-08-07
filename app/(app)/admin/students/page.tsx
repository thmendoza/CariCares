import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AddStudentForm } from "./add-student-form";
import { AssignTeacherForm } from "./assign-teacher-form";
import { StudentAcademicLevelForm } from "@/components/students/student-academic-level-form";

export default async function AdminStudentsPage() {
  const session = await auth();
  if (session?.user?.role !== "SCHOOL_ADMIN") redirect("/dashboard");

  const [students, teachers] = await Promise.all([
    db.student.findMany({
      where: { isActive: true },
      include: {
        teachers: { include: { user: { select: { id: true, name: true, email: true } } } },
        subjectLevels: { select: { subject: true, gradeLevel: true } },
      },
      orderBy: { lastName: "asc" },
    }),
    db.user.findMany({
      where: { role: "TEACHER", accountStatus: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-h1 text-foreground mb-6">Student Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            Add Student
          </h2>
          <AddStudentForm />
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            Students ({students.length})
          </h2>
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="paper px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {student.lastName}, {student.firstName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Therapist: {student.therapistStatus.replace(/_/g, " ")}
                    </p>
                    {student.teachers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Teachers: {student.teachers.map((t) => t.user.name ?? t.user.email).join(", ")}
                      </p>
                    )}
                    <div className="mt-2">
                      <StudentAcademicLevelForm
                        studentId={student.id}
                        initialProgram={student.program}
                        initialEnrolledGradeLevel={student.enrolledGradeLevel}
                        initialSubjectLevels={student.subjectLevels}
                      />
                    </div>
                  </div>
                  <AssignTeacherForm
                    studentId={student.id}
                    teachers={teachers.map((t) => ({ id: t.id, name: t.name ?? t.email ?? "" }))}
                    assignedIds={student.teachers.map((t) => t.userId)}
                  />
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <p className="text-sm text-muted-foreground">No students added yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
