import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonSize = "sm" | "md" | "lg";

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60";

export function primaryButtonClass(size: ButtonSize = "md", className?: string) {
  return cn(base, sizeClass[size], "bg-primary text-primary-foreground shadow-paper", className);
}

export function secondaryButtonClass(size: ButtonSize = "md", className?: string) {
  return cn(
    base,
    sizeClass[size],
    "border border-border text-muted-foreground hover:translate-y-0 hover:bg-muted",
    className,
  );
}

export function onDarkButtonClass(size: ButtonSize = "md", className?: string) {
  return cn(base, sizeClass[size], "bg-card text-foreground shadow-lift", className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export function PrimaryButton({ size = "md", fullWidth, className, ...props }: ButtonProps) {
  return <button {...props} className={primaryButtonClass(size, cn(fullWidth && "w-full", className))} />;
}

export function SecondaryButton({ size = "md", fullWidth, className, ...props }: ButtonProps) {
  return <button {...props} className={secondaryButtonClass(size, cn(fullWidth && "w-full", className))} />;
}
