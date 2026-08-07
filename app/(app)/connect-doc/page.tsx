import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ConnectDocForm } from "@/components/google-docs/connect-doc-form";
import { WordUploadCard } from "@/components/google-docs/word-upload-card";
import { Sparkles } from "lucide-react";

const ALLOWED_ROLES = ["TEACHER", "ACADEMIC_COORDINATOR", "SCHOOL_ADMIN", "THERAPIST"];

export default async function ConnectDocPage() {
  const session = await auth();
  const role = session?.user?.role;
  const accountStatus = session?.user?.accountStatus;

  if (!session || accountStatus !== "ACTIVE" || !role || !ALLOWED_ROLES.includes(role)) {
    redirect("/dashboard");
  }

  const isTeacher = role === "TEACHER";
  const students = isTeacher
    ? await db.student.findMany({
        where: { isActive: true, teachers: { some: { userId: session.user.id } } },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { lastName: "asc" },
      })
    : await db.student.findMany({
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { lastName: "asc" },
      });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-h1 text-foreground mb-2">Connect an IEP</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Bring in a document from Google Docs, or upload one you already have as a Word file.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-h3 text-foreground">Google Docs</h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              Recommended
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Paste a link to a Google Doc stored in the approved I-CARe folder. You can keep
            editing in Google Docs while it&apos;s under review.
          </p>
          <ConnectDocForm />
        </div>

        <div className="lg:col-span-2">
          <WordUploadCard students={students} />
        </div>
      </div>
    </div>
  );
}
