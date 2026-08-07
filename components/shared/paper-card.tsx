import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PaperCardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  accent?: "primary" | "secondary" | "sage" | "olive" | "none";
  interactive?: boolean;
}

const accentClass = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  sage: "bg-sage",
  olive: "bg-olive",
  none: "",
} as const;

export function PaperCard({
  children,
  className,
  as: Tag = "div",
  accent = "none",
  interactive = false,
}: PaperCardProps) {
  return (
    <Tag className={cn("paper", interactive && "transition-transform hover:-translate-y-1", className)}>
      {accent !== "none" && <div className={cn("h-1.5 w-12 rounded-full mb-4", accentClass[accent])} />}
      {children}
    </Tag>
  );
}
