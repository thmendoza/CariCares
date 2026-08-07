"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  flagId: string;
  currentStatus: string;
  userRole: string;
}

export function FlagActionsClient({ flagId, currentStatus, userRole }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canDecide =
    currentStatus === "PENDING_COORDINATOR" &&
    (userRole === "ACADEMIC_COORDINATOR" || userRole === "SCHOOL_ADMIN");

  if (!canDecide) return null;

  async function decide(action: "approve" | "dismiss") {
    setLoading(true);
    await fetch(`/api/flags/${flagId}/decide`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => decide("approve")}
        disabled={loading}
        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-care-green-light text-[#3F6B3A] hover:bg-[#E3EFDD] transition-colors disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => decide("dismiss")}
        disabled={loading}
        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-cream text-muted-foreground hover:bg-cream/70 transition-colors disabled:opacity-50"
      >
        Dismiss
      </button>
    </div>
  );
}
