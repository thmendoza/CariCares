"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mascot } from "@/components/shared/mascot";
import { Button } from "@/components/ui/button";

const ROLES = [
  {
    value: "TEACHER",
    label: "Teacher",
    description: "Upload and manage your students' IEPs, review AI feedback.",
  },
  {
    value: "ACADEMIC_COORDINATOR",
    label: "Academic Coordinator",
    description:
      "Review and approve AI flags, leave comments, give first-stage approval.",
  },
  {
    value: "SCHOOL_ADMIN",
    label: "School Admin",
    description:
      "Approve new user accounts, leave comments, give final approval.",
  },
  {
    value: "THERAPIST",
    label: "Therapist",
    description:
      "Add therapy goals to student IEPs. Trusted directly, no coordinator approval needed.",
  },
] as const;

const ADMIN_TITLES = [
  { value: "VP", label: "Vice Principal" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "SCHOOL_DIRECTOR", label: "School Director" },
] as const;

export function RoleSelectForm() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedRole) return;
    if (selectedRole === "SCHOOL_ADMIN" && !selectedTitle) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, adminTitle: selectedTitle }),
      });

      if (!res.ok) throw new Error("Failed to set role");
      router.push("/pending-approval");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <Mascot scene="greet" size="md" className="mb-4" />
          <h1 className="text-xl font-bold text-foreground">Welcome to I-CARe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select your role to get started
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <h2 className="text-base font-semibold text-foreground mb-4">
            What is your role?
          </h2>

          <div className="space-y-3 mb-6">
            {ROLES.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                  selectedRole === role.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-medium text-foreground text-sm">
                  {role.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {role.description}
                </div>
              </button>
            ))}
          </div>

          {selectedRole === "SCHOOL_ADMIN" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Your title
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ADMIN_TITLES.map((title) => (
                  <button
                    key={title.value}
                    onClick={() => setSelectedTitle(title.value)}
                    className={`rounded-xl border-2 py-2 px-3 text-sm font-medium transition-colors ${
                      selectedTitle === title.value
                        ? "border-primary bg-primary/10 text-[#A83E68]"
                        : "border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {title.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-care-red-light border border-care-red/30 px-4 py-3 text-sm text-[#A8402C]">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={
              !selectedRole ||
              (selectedRole === "SCHOOL_ADMIN" && !selectedTitle) ||
              loading
            }
            className="w-full"
            size="lg"
          >
            {loading ? "Submitting…" : "Request access"}
          </Button>
        </div>
      </div>
    </div>
  );
}
