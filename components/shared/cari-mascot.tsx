import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Cari — the official I-CARe mascot, ported from the approved Lovable
 * design. One sprite (public/lovable/cari.png), re-posed with CSS
 * transforms only — do not swap the asset or generate alternatives.
 */
export type CariPose = "wave" | "float" | "peek" | "think" | "celebrate" | "still";

const poseClass: Record<CariPose, string> = {
  wave: "wave-slow",
  float: "float-slow",
  peek: "float-slow -scale-x-100",
  think: "-rotate-3",
  celebrate: "float-slow rotate-2",
  still: "",
};

export interface CariMascotProps {
  pose?: CariPose;
  className?: string;
  alt?: string;
  size?: number;
}

export function CariMascot({
  pose = "still",
  className,
  alt = "Cari, the I-CARe guide",
  size = 160,
}: CariMascotProps) {
  return (
    <Image
      src="/lovable/cari.png"
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={cn(
        "select-none object-contain drop-shadow-[0_18px_24px_rgba(90,70,40,0.18)]",
        poseClass[pose],
        className,
      )}
    />
  );
}
