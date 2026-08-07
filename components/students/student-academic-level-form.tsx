"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PROGRAM_LABELS, PROGRAM_GROUPS } from "@/lib/program-labels";
import type { Program } from "@/app/generated/prisma/client";

const COMMON_SUBJECTS = ["Reading", "Language", "Math", "Science", "Social Studies"];

interface SubjectLevel {
  subject: string;
  gradeLevel: string;
}

interface Props {
  studentId: string;
  initialProgram: Program | null;
  initialEnrolledGradeLevel: string | null;
  initialSubjectLevels: SubjectLevel[];
  compact?: boolean;
}

export function StudentAcademicLevelForm({
  studentId,
  initialProgram,
  initialEnrolledGradeLevel,
  initialSubjectLevels,
  compact = false,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [program, setProgram] = useState<Program | "">(initialProgram ?? "");
  const [enrolledGradeLevel, setEnrolledGradeLevel] = useState(initialEnrolledGradeLevel ?? "");
  const [subjectLevels, setSubjectLevels] = useState<SubjectLevel[]>(initialSubjectLevels);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, field: keyof SubjectLevel, value: string) {
    setSubjectLevels((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setSubjectLevels((rows) => [...rows, { subject: "", gradeLevel: "" }]);
  }

  function removeRow(index: number) {
    setSubjectLevels((rows) => rows.filter((_, i) => i !== index));
  }

  async function save() {
    setLoading(true);
    setError(null);

    const cleanSubjectLevels = subjectLevels
      .map((row) => ({ subject: row.subject.trim(), gradeLevel: row.gradeLevel.trim() }))
      .filter((row) => row.subject && row.gradeLevel);

    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        program: program || null,
        enrolledGradeLevel: enrolledGradeLevel.trim() || undefined,
        subjectLevels: cleanSubjectLevels,
      }),
    });

    setLoading(false);
    if (res.ok) {
      setSubjectLevels(cleanSubjectLevels);
      setEditing(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ? "Couldn't save — check the fields." : "Failed to save.");
    }
  }

  function cancel() {
    setProgram(initialProgram ?? "");
    setEnrolledGradeLevel(initialEnrolledGradeLevel ?? "");
    setSubjectLevels(initialSubjectLevels);
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    const summary = [
      program ? PROGRAM_LABELS[program] : null,
      enrolledGradeLevel ? `Enrolled: ${enrolledGradeLevel}` : null,
      ...subjectLevels
        .filter((s) => s.subject && s.gradeLevel)
        .map((s) => `${s.subject}: ${s.gradeLevel}`),
    ].filter(Boolean);

    return (
      <div className={compact ? "flex items-center gap-2 flex-wrap" : ""}>
        <p className="text-xs text-care-muted">
          {summary.length > 0 ? summary.join(" · ") : "No academic level recorded"}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-care-pink-deep hover:underline"
        >
          {summary.length > 0 ? "Edit" : "+ Add academic level"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-care-cream p-3 space-y-3 bg-care-ivory">
      <div>
        <label className="block text-xs font-medium text-care-charcoal mb-1">CARe Program</label>
        <select
          value={program}
          onChange={(e) => setProgram(e.target.value as Program | "")}
          className="w-full rounded-lg border border-care-cream px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-care-pink-deep"
        >
          <option value="">Not set</option>
          {PROGRAM_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((value) => (
                <option key={value} value={value}>
                  {PROGRAM_LABELS[value]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-care-charcoal mb-1">Enrolled grade level</label>
        <input
          value={enrolledGradeLevel}
          onChange={(e) => setEnrolledGradeLevel(e.target.value)}
          placeholder="e.g. Grade 5"
          className="w-full rounded-lg border border-care-cream px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-care-pink-deep"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-care-charcoal">
          Per-subject instructional level (for pull-out subjects)
        </label>
        {subjectLevels.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={COMMON_SUBJECTS.includes(row.subject) ? row.subject : row.subject ? "Other" : ""}
              onChange={(e) =>
                updateRow(i, "subject", e.target.value === "Other" ? "" : e.target.value)
              }
              className="rounded-lg border border-care-cream px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-care-pink-deep"
            >
              <option value="" disabled>Subject</option>
              {COMMON_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="Other">Other…</option>
            </select>
            {!COMMON_SUBJECTS.includes(row.subject) && (
              <input
                value={row.subject}
                onChange={(e) => updateRow(i, "subject", e.target.value)}
                placeholder="Subject name"
                className="w-28 rounded-lg border border-care-cream px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-care-pink-deep"
              />
            )}
            <input
              value={row.gradeLevel}
              onChange={(e) => updateRow(i, "gradeLevel", e.target.value)}
              placeholder="e.g. Grade 4 level"
              className="flex-1 rounded-lg border border-care-cream px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-care-pink-deep"
            />
            <button
              onClick={() => removeRow(i)}
              className="text-xs text-care-muted/70 hover:text-care-red-deep"
              aria-label="Remove subject"
            >
              ✕
            </button>
          </div>
        ))}
        <button onClick={addRow} className="text-xs font-medium text-care-pink-deep hover:underline">
          + Add subject
        </button>
      </div>

      {error && <p className="text-xs text-care-red-deep">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
