import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const HCJM_LOGO_URL = "/lovable/hcjm-logo.png";
export const CARE_LOGO_URL = "/lovable/care-logo.png";
export const HCJM_LOGO_ALT = "Holy Child Jesus Montessori School of Dasmariñas Inc. logo";
export const CARE_LOGO_ALT = "CARe Academic Program logo";

export interface LogoLockupProps {
  onDark?: boolean;
  className?: string;
  compact?: boolean;
  logosOnly?: boolean;
  href?: string;
}

export function LogoLockup({ onDark = false, className, compact = false, logosOnly = false, href }: LogoLockupProps) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <Image
          src={HCJM_LOGO_URL}
          alt={HCJM_LOGO_ALT}
          width={compact ? 36 : 48}
          height={compact ? 36 : 48}
          unoptimized
          className={cn("w-auto object-contain", compact ? "h-9" : "h-12")}
        />
        <Image
          src={CARE_LOGO_URL}
          alt={CARE_LOGO_ALT}
          width={compact ? 32 : 40}
          height={compact ? 32 : 40}
          unoptimized
          className={cn("w-auto object-contain", compact ? "h-8" : "h-10")}
        />
      </div>
      {!logosOnly && (
        <>
          <span className={cn("hidden h-10 w-px sm:block", onDark ? "bg-white/35" : "bg-border")} />
          <span className="hidden leading-tight sm:block">
            <span className={cn("block font-display text-lg font-semibold", onDark ? "text-white" : "text-foreground")}>
              I-CARe
            </span>
            <span className={cn("block text-[0.7rem] tracking-wide uppercase", onDark ? "text-white/75" : "text-muted-foreground")}>
              IEP Review Assistant
            </span>
          </span>
        </>
      )}
    </>
  );

  const inner = <div className={cn("flex items-center gap-3", className)}>{content}</div>;
  return href ? <Link href={href}>{inner}</Link> : inner;
}
