import { CariMascot, type CariPose } from "@/components/shared/cari-mascot";
import { cn } from "@/lib/utils";

export type MascotScene =
  | "wave" // landing hero
  | "greet" // small dashboard greeting
  | "read" // loading state
  | "hold-folder" // empty state
  | "thumbs-up" // connected Google Doc
  | "checklist" // review complete
  | "celebrate" // approved
  | "confused"; // error state

interface MascotProps {
  scene?: MascotScene;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  alt?: string;
  priority?: boolean;
}

// Thin compatibility wrapper: keeps every existing `<Mascot scene="..." />`
// call site working while rendering the real, approved Lovable mascot (one
// sprite, public/lovable/cari.png, re-posed with CSS transforms) instead of
// the earlier 8-image AI-generated sprite sheet.
const SCENE_POSE: Record<MascotScene, CariPose> = {
  wave: "wave",
  greet: "float",
  read: "think",
  "hold-folder": "float",
  "thumbs-up": "float",
  checklist: "float",
  celebrate: "celebrate",
  confused: "think",
};

const SCENE_ALT: Record<MascotScene, string> = {
  wave: "Cari waving hello",
  greet: "Cari smiling warmly",
  read: "Cari thinking",
  "hold-folder": "Cari ready to get started",
  "thumbs-up": "Cari giving a thumbs up",
  checklist: "Cari smiling warmly",
  celebrate: "Cari celebrating",
  confused: "Cari looking puzzled",
};

const SIZE_PX: Record<NonNullable<MascotProps["size"]>, number> = {
  sm: 32,
  md: 64,
  lg: 120,
  xl: 220,
};

export function Mascot({ scene = "greet", size = "md", className, alt }: MascotProps) {
  return (
    <CariMascot
      pose={SCENE_POSE[scene]}
      size={SIZE_PX[size]}
      alt={alt ?? SCENE_ALT[scene]}
      className={cn("flex-shrink-0", className)}
    />
  );
}
