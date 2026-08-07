import type { Program } from "@/app/generated/prisma/client";

// Matches the CARe department's own "Graded vs. Non-Graded" program taxonomy.
export const PROGRAM_LABELS: Record<Program, string> = {
  FULL_INCLUSION_NO_SERVICES: "Full Inclusion — without services",
  FULL_INCLUSION_SHADOW: "Full Inclusion — with shadow teacher / SNEd tutorial",
  PARTIAL_INCLUSION_PULLOUT: "Partial Inclusion — Pull-Out",
  PARTIAL_INCLUSION_INTENSIVE: "Partial Inclusion — Intensive Resource Program",
  PRE_VOCATIONAL: "Pre-Vocational",
  EARLY_CHILDHOOD: "Early Childhood",
};

export const PROGRAM_GROUPS: { label: string; options: Program[] }[] = [
  {
    label: "Graded",
    options: ["FULL_INCLUSION_NO_SERVICES", "FULL_INCLUSION_SHADOW", "PARTIAL_INCLUSION_PULLOUT", "PARTIAL_INCLUSION_INTENSIVE"],
  },
  {
    label: "Non-Graded",
    options: ["PRE_VOCATIONAL", "EARLY_CHILDHOOD"],
  },
];
