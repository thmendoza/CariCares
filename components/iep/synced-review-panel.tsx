"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FlagActionsClient } from "@/app/(app)/students/[studentId]/iep/[iepId]/review/flag-actions-client";
import type { FlagSeverity } from "@/app/generated/prisma/client";
import { SEVERITY_STYLES } from "@/lib/severity-styles";

export interface ReviewFlag {
  id: string;
  severity: FlagSeverity;
  status: string;
  category: string;
  highlightText: string;
  recommendation: string;
  suggestedText: string | null;
  sectionLabel: string;
  sectionId: string;
  // DOM element id every flag anchors to — either the exact highlighted text
  // (`flag-{id}`) or, when that can't be located, the section heading
  // (`section-anchor-{sectionId}`). Every flag has one; there is no
  // "unanchored" state.
  anchorId: string;
  exactMatch: boolean;
}

const GAP = 12;
const RECOMPUTE_DEBOUNCE_MS = 120;

interface Props {
  children: ReactNode;
  flags: ReviewFlag[];
  userRole: string;
  emptyMessage: string;
}

export function SyncedReviewPanel({ children, flags, userRole, emptyMessage }: Props) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [focusedFlagId, setFocusedFlagId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, number>>(new Map());
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const docPaneRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Google-Docs-style comment layout: read every anchor/card's real position
  // first (batched, no interleaved writes — avoids layout thrashing), then
  // greedily push cards down so close-together flags don't overlap. Every
  // flag has an anchorId (exact text or a section heading fallback), so
  // every flag participates here — nothing falls outside the sync.
  const recomputeLayout = useCallback(() => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.getBoundingClientRect().top + window.scrollY;

    const measurements: { id: string; naturalTop: number; height: number }[] = [];
    for (const flag of flags) {
      const anchorEl = document.getElementById(flag.anchorId);
      const cardEl = cardRefs.current.get(flag.id);
      if (!anchorEl || !cardEl) continue;
      const naturalTop = anchorEl.getBoundingClientRect().top + window.scrollY - containerTop;
      const height = cardEl.getBoundingClientRect().height;
      measurements.push({ id: flag.id, naturalTop, height });
    }
    measurements.sort((a, b) => a.naturalTop - b.naturalTop);

    const newPositions = new Map<string, number>();
    let cursor = 0;
    for (const m of measurements) {
      const top = Math.max(m.naturalTop, cursor);
      newPositions.set(m.id, top);
      cursor = top + m.height + GAP;
    }

    setPositions(newPositions);
    setContainerHeight(measurements.length > 0 ? cursor - GAP : 0);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags]);

  // Resolve desktop/mobile client-side only — defaulting false keeps the
  // server-rendered and first client render identical, avoiding a hydration
  // mismatch. The layout only flips to the synced view after this settles.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Runs before paint, so the flip from hidden/static to visible/absolute
  // happens in the same frame — no visible jump. Also re-fires whenever the
  // flags array changes identity (e.g. after Approve/Dismiss → router.refresh()).
  useLayoutEffect(() => {
    if (!isDesktop) return;
    recomputeLayout();
  }, [isDesktop, recomputeLayout]);

  // Secondary triggers: content reflow (width change, table wrapping, etc.),
  // viewport resize, and web fonts finishing load (Inter, loaded via
  // globals.css) — any of these can shift where an anchor sits after the
  // first measurement.
  useEffect(() => {
    if (!isDesktop || !docPaneRef.current) return;
    let timeout: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(timeout);
      timeout = setTimeout(recomputeLayout, RECOMPUTE_DEBOUNCE_MS);
    };
    const observer = new ResizeObserver(debounced);
    observer.observe(docPaneRef.current);
    window.addEventListener("resize", debounced);
    document.fonts?.ready?.then(recomputeLayout);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener("resize", debounced);
    };
  }, [isDesktop, recomputeLayout]);

  // Anchor → card: highlighted spans (and section-heading fallbacks) are raw
  // HTML injected server-side, so they can't carry real React handlers —
  // delegate via a single document listener. Handles both the exact-text
  // <mark data-flag-id> case and the section-heading <mark data-flag-ids>
  // fallback (focuses the first flag anchored there).
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const markEl = target.closest("mark[data-flag-id], mark[data-flag-ids]");
      if (!markEl) return;
      const id =
        markEl.getAttribute("data-flag-id") ?? markEl.getAttribute("data-flag-ids")?.split(",")[0];
      if (!id) return;
      setFocusedFlagId(id);
      cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function jumpToAnchor(flag: ReviewFlag) {
    const el = document.getElementById(flag.anchorId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flag-flash-highlight");
    setTimeout(() => el.classList.remove("flag-flash-highlight"), 1000);
    setFocusedFlagId(flag.id);
  }

  function setCardRef(id: string) {
    return (el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(id, el);
      else cardRefs.current.delete(id);
    };
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2" ref={docPaneRef}>
        {children}
      </div>

      <div className="lg:col-span-1">
        <h2 className="text-sm font-semibold text-foreground mb-3">AI Suggestions</h2>

        {flags.length === 0 ? (
          <div className="paper p-6 text-center">
            <p className="text-xs text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : isDesktop ? (
          <div
            ref={containerRef}
            style={{ position: "relative", height: containerHeight ?? undefined }}
          >
            {flags.map((flag) => (
              <div
                key={flag.id}
                ref={setCardRef(flag.id)}
                style={
                  ready && positions.has(flag.id)
                    ? { position: "absolute", top: positions.get(flag.id), left: 0, right: 0 }
                    : { position: "static", visibility: "hidden" }
                }
              >
                <FlagCardBody
                  flag={flag}
                  userRole={userRole}
                  focused={focusedFlagId === flag.id}
                  onJump={() => jumpToAnchor(flag)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <FlagCardBody
                key={flag.id}
                flag={flag}
                userRole={userRole}
                focused={focusedFlagId === flag.id}
                onJump={() => jumpToAnchor(flag)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FlagCardBody({
  flag,
  userRole,
  focused,
  onJump,
}: {
  flag: ReviewFlag;
  userRole: string;
  focused: boolean;
  onJump: () => void;
}) {
  const style = SEVERITY_STYLES[flag.severity];
  return (
    <div
      className={`border-l-4 ${style.border} bg-card rounded-r-xl border border-l-0 border-border shadow-paper p-4 space-y-2 transition-shadow ${
        focused ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.label}
        </span>
        <span className="text-xs font-medium text-foreground">
          {flag.category.replace(/_/g, " ")}
        </span>
        {flag.status === "PENDING_COORDINATOR" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-care-peach/40 text-[#8A5A28]">
            Pending coordinator
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onJump}
        className="block w-full text-left text-xs bg-ivory hover:bg-primary/10 rounded-lg px-3 py-2 text-muted-foreground transition-colors"
      >
        <span className="text-muted-foreground/70">{flag.sectionLabel}</span>
        {flag.highlightText && (
          <span className="block font-mono line-clamp-3 mt-0.5">
            &ldquo;{flag.highlightText}&rdquo;
          </span>
        )}
      </button>

      <p className="text-xs text-foreground leading-relaxed">{flag.recommendation}</p>

      {flag.suggestedText && (
        <div className="text-xs bg-care-green-light rounded-lg px-3 py-2 text-[#3F6B3A]">
          <span className="font-semibold">Suggested rewrite: </span>
          {flag.suggestedText}
        </div>
      )}

      <FlagActionsClient flagId={flag.id} currentStatus={flag.status} userRole={userRole} />
    </div>
  );
}
