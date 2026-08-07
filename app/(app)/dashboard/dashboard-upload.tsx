"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dropzone } from "@/components/shared/dropzone";
import { Upload } from "lucide-react";
import { QuickActions } from "@/components/dashboard/quick-actions";

interface Props {
  students: { id: string; firstName: string; lastName: string }[];
  headingLabel: string;
}

export function DashboardUpload({ students, headingLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleUpload(
    file: File,
    meta: { studentId: string; schoolYear: string; quarter: number }
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentId", meta.studentId);
    formData.append("schoolYear", meta.schoolYear);
    formData.append("quarter", String(meta.quarter));

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Upload failed");
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-h2 text-foreground">{headingLabel}</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          <QuickActions />
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground hover:-translate-y-0.5 transition-transform"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload IEP
          </button>
        </div>
      </div>

      {open && (
        <div className="mb-2">
          <Dropzone onUpload={handleUpload} students={students} />
        </div>
      )}
    </div>
  );
}
