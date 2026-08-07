"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface Props {
  endpoint: string;       // DELETE will be called here
  confirmMessage: string; // shown in confirm dialog
  redirectTo?: string;    // navigate here after delete
  onDeleted?: () => void; // alternative to redirect
  label?: string;
  className?: string;
}

export function DeleteButton({
  endpoint,
  confirmMessage,
  redirectTo,
  onDeleted,
  label,
  className = "",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(confirmMessage)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Delete failed.");
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title={label ?? "Delete"}
      className={`inline-flex items-center gap-1 text-xs text-care-red hover:text-care-red-deep transition-colors disabled:opacity-40 ${className}`}
    >
      <Trash2 className="w-3.5 h-3.5" />
      {label && <span>{loading ? "Deleting…" : label}</span>}
    </button>
  );
}
