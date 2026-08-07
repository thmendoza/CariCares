"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoLockup } from "@/components/shared/logo-lockup";

export interface AppNavItem {
  label: string;
  href: string;
}

interface AppTopBarProps {
  navItems: AppNavItem[];
  roleLabel: string;
  initials: string;
  children: React.ReactNode; // sign-out form, rendered server-side, passed through
}

export function AppTopBar({ navItems, roleLabel, initials, children }: AppTopBarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navLinks = (onNavigate?: () => void) => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            isActive(item.href) ? "bg-cream text-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <LogoLockup compact href="/dashboard" />

        <nav className="hidden lg:flex items-center gap-1">{navLinks()}</nav>

        <div className="hidden lg:flex items-center gap-3">
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-[0.7rem] tracking-wide text-muted-foreground uppercase">{roleLabel}</span>
            <span className="block h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center ml-auto">
              {initials}
            </span>
          </span>
          {children}
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="lg:hidden p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-1">{navLinks(() => setMobileOpen(false))}</nav>
          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-border">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cream text-foreground">
              {roleLabel}
            </span>
            {children}
          </div>
        </div>
      )}
    </header>
  );
}
