import { WRITING_QUALITY_CATEGORIES } from "@/lib/ai/framework";

const WRITING_QUALITY_SET = new Set<string>(WRITING_QUALITY_CATEGORIES);

// The framework's severity is meant to be judged per-instance, not fixed per
// category — so unlike the old binary HIGH/LOW system, we don't force floors
// on the content categories. The one thing we still don't trust the model to
// get right on its own: writing-quality issues are never more than a MINOR
// concern, no matter how the model rates them.
const SEVERITY_RANK: Record<string, number> = {
  SUGGESTION: 0,
  MINOR: 1,
  MAJOR: 2,
  CRITICAL: 3,
};

export function overrideSeverity(
  category: string,
  aiSeverity: "CRITICAL" | "MAJOR" | "MINOR" | "SUGGESTION"
): "CRITICAL" | "MAJOR" | "MINOR" | "SUGGESTION" {
  if (WRITING_QUALITY_SET.has(category) && SEVERITY_RANK[aiSeverity] > SEVERITY_RANK.MINOR) {
    return "MINOR";
  }
  return aiSeverity;
}

// Categories where the model is asked to supply a full corrected/rewritten
// text rather than just a description of the fix.
export const SUGGESTED_TEXT_CATEGORIES = WRITING_QUALITY_SET;

// A bare grade-level citation (e.g. "Grade 1", "Pull Out (...) Grade 1") as the
// ENTIRE highlightText is never itself a valid issue, regardless of category —
// confirmed this session as a recurring false-positive pattern the model
// doesn't reliably avoid even when explicitly instructed not to.
const BARE_GRADE_LEVEL_RE = /^(pull[\s-]*out\s*\([^)]*\)|(enrolled\s*(in\s*)?)?grade\s*\d+)\.?$/i;

export function isBareGradeLevelMention(highlightText: string): boolean {
  return BARE_GRADE_LEVEL_RE.test(highlightText.trim());
}
