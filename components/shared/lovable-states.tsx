import type { ReactNode } from "react";
import { CariMascot } from "@/components/shared/cari-mascot";
import { cn } from "@/lib/utils";

interface BaseStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Cari waits patiently beside anything that is still empty. */
export function LovableEmptyState({ title, description, action, className }: BaseStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-ivory p-9 text-center", className)}>
      <CariMascot pose="float" size={112} className="w-28" alt="Cari waiting beside an empty folder" />
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function LovableLoadingState({ title = "Cari is reading…", description, className }: Partial<BaseStateProps>) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-2xl border border-border bg-ivory p-9 text-center", className)} role="status" aria-live="polite">
      <CariMascot pose="float" size={96} className="w-24" alt="Cari reading the document" />
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-secondary" />
      </div>
    </div>
  );
}

export function LovableErrorState({ title, description, action, className }: BaseStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-2xl border border-border bg-cream/70 p-9 text-center", className)} role="alert">
      <CariMascot pose="think" size={96} className="w-24" alt="Cari thinking something over" />
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function LovableSuccessState({ title, description, action, className }: BaseStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-5 p-12 text-center", className)}>
      <CariMascot pose="celebrate" size={144} className="w-36" alt="Cari celebrating" />
      <h2 className="text-3xl">{title}</h2>
      {description && <p className="max-w-md text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
