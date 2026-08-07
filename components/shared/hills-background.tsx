import { cn } from "@/lib/utils";

export const HILLS_VIDEO_URL = "/lovable/hills.mp4";
export const HILLS_POSTER_URL = "/lovable/hills-poster.jpg";

/** The official animated rolling-hills background, always paired with HeroVeil. */
export function HillsBackground({ className }: { className?: string }) {
  return (
    <video
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      src={HILLS_VIDEO_URL}
      poster={HILLS_POSTER_URL}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}

export function HeroVeil({ className }: { className?: string }) {
  return <div className={cn("hero-veil absolute inset-0", className)} aria-hidden="true" />;
}
