"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountStatus } from "@/app/generated/prisma/client";

interface Props {
  userId: string;
  currentStatus: AccountStatus;
}

export function UserActionsClient({ userId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: AccountStatus) {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  if (currentStatus === "PENDING_APPROVAL") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => updateStatus("ACTIVE")}
          disabled={loading}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => updateStatus("SUSPENDED")}
          disabled={loading}
        >
          Reject
        </Button>
      </div>
    );
  }

  if (currentStatus === "ACTIVE") {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => updateStatus("SUSPENDED")}
        disabled={loading}
        className="text-destructive hover:text-[#A8402C] hover:bg-care-red-light"
      >
        Suspend
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => updateStatus("ACTIVE")}
      disabled={loading}
    >
      Reinstate
    </Button>
  );
}
