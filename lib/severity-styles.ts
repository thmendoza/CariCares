import type { FlagSeverity, LayerStatus, IepReadiness } from "@/app/generated/prisma/client";

export const SEVERITY_STYLES: Record<FlagSeverity, { border: string; badge: string; label: string }> = {
  CRITICAL: {
    border: "border-l-care-red",
    badge: "bg-care-red-light text-[#A8402C]",
    label: "Critical",
  },
  MAJOR: {
    border: "border-l-care-peach",
    badge: "bg-care-peach/40 text-[#8A5A28]",
    label: "Major",
  },
  MINOR: {
    border: "border-l-care-pink",
    badge: "bg-care-pink-mid text-[#A83E68]",
    label: "Minor",
  },
  SUGGESTION: {
    border: "border-l-care-cream",
    badge: "bg-care-cream text-care-muted",
    label: "Suggestion",
  },
};

export const LAYER_STATUS_STYLES: Record<LayerStatus, { badge: string; label: string }> = {
  PASS: { badge: "bg-care-green-light text-[#3F6B3A]", label: "Pass" },
  NEEDS_REVIEW: { badge: "bg-care-peach/40 text-[#8A5A28]", label: "Needs Review" },
  FAIL: { badge: "bg-care-red-light text-[#A8402C]", label: "Fail" },
};

export const READINESS_STYLES: Record<IepReadiness, { badge: string; label: string }> = {
  READY: { badge: "bg-care-green-light text-[#3F6B3A]", label: "Ready" },
  NEEDS_REVISION: { badge: "bg-care-peach/40 text-[#8A5A28]", label: "Needs Revision" },
  HIGH_RISK_OF_OMISSION: { badge: "bg-care-red-light text-[#A8402C]", label: "High Risk of Omission" },
};
