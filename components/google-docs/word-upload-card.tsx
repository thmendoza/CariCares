"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dropzone } from "@/components/shared/dropzone";
import { FileType } from "lucide-react";

interface Props {
  students: { id: string; firstName: string; lastName: string }[];
}

export function WordUploadCard({ students }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

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

    router.push("/dashboard");
  }

  return (
    <div className="paper p-5">
      <div className="flex items-center gap-2 mb-1">
        <FileType className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-h3 text-foreground">Word Document</h2>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cream text-muted-foreground">
          Secondary
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Already have an IEP saved as a .docx file? Upload it directly.
      </p>
      {open ? (
        <Dropzone onUpload={handleUpload} students={students} />
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium px-4 py-2 rounded-lg border border-border text-foreground hover:bg-cream transition-colors"
        >
          Upload a Word document
        </button>
      )}
    </div>
  );
}
