"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlagSeverity, FlagStatus } from "@/app/generated/prisma/client";
import { SEVERITY_STYLES } from "@/lib/severity-styles";

interface Flag {
  id: string;
  severity: FlagSeverity;
  status: FlagStatus;
  category: string;
  highlightText: string;
  recommendation: string;
}

export function FlagCardClient({ flag }: { flag: Flag }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function decide(action: "approve" | "dismiss") {
    setLoading(true);
    await fetch(`/api/flags/${flag.id}/decide`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    router.refresh();
  }

  const style = SEVERITY_STYLES[flag.severity];

  return (
    <div
      className={`border-l-4 ${style.border} bg-card rounded-r-xl border border-l-0 border-border p-4 space-y-2`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
        <span className="text-xs font-medium text-foreground">
          {flag.category.replace(/_/g, " ")}
        </span>
      </div>

      {flag.highlightText && (
        <p className="text-xs bg-ivory rounded-lg px-3 py-2 text-muted-foreground font-mono line-clamp-2">
          &ldquo;{flag.highlightText}&rdquo;
        </p>
      )}

      <p className="text-xs text-foreground leading-relaxed">{flag.recommendation}</p>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => decide("approve")}
          disabled={loading}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-care-green-light text-[#3F6B3A] hover:bg-[#E3EFDD] transition-colors disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => decide("dismiss")}
          disabled={loading}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-cream text-muted-foreground hover:bg-cream/70 transition-colors disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
