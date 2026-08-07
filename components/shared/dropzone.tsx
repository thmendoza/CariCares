"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onUpload: (file: File, meta: { studentId: string; schoolYear: string; quarter: number }) => Promise<void>;
  students: { id: string; firstName: string; lastName: string }[];
}

export function Dropzone({ onUpload, students }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [studentId, setStudentId] = useState("");
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [quarter, setQuarter] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function currentSchoolYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".docx")) setFile(dropped);
    else setError("Only .docx files are supported.");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      await onUpload(file, { studentId, schoolYear, quarter });
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
        className={cn(
          "rounded-card border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
          dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 bg-card"
        )}
      >
        <Upload className="w-8 h-8 text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {file ? file.name : "Drop an IEP (.docx) here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Only Word documents (.docx) are accepted</p>
        </div>
        <input
          id="file-input"
          type="file"
          accept=".docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
        />
      </div>

      {file && (
        <div className="mt-4 paper p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Student</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName}, {s.firstName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">School year</label>
            <input
              type="text"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              placeholder="2025-2026"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Quarter</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>Q{q}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="col-span-full text-xs text-destructive">{error}</p>
          )}

          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              disabled={!studentId || loading}
              className="rounded-xl bg-primary text-white px-5 py-2 text-sm font-medium hover:-translate-y-0.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Uploading…" : "Upload IEP"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
