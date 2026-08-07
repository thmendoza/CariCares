"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AddStudentForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });

    setLoading(false);
    if (res.ok) {
      setFirstName("");
      setLastName("");
      setSuccess(true);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to add student");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="paper p-5 space-y-4">
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">First name</label>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          placeholder="e.g. Maria"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Last name</label>
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          placeholder="e.g. Santos"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-care-green-deep">Student added.</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Adding…" : "Add student"}
      </Button>
    </form>
  );
}
