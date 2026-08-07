"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  studentId: string;
  teachers: { id: string; name: string }[];
  assignedIds: string[];
}

export function AssignTeacherForm({ studentId, teachers, assignedIds }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function assign(userId: string) {
    setLoading(true);
    await fetch(`/api/students/${studentId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(false);
    router.refresh();
  }

  const unassigned = teachers.filter((t) => !assignedIds.includes(t.id));
  if (unassigned.length === 0) return null;

  return (
    <select
      disabled={loading}
      defaultValue=""
      onChange={(e) => { if (e.target.value) assign(e.target.value); }}
      className="text-xs rounded-lg border border-border px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-shrink-0"
    >
      <option value="">+ Assign teacher</option>
      {unassigned.map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}
