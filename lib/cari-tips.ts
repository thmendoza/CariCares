/**
 * Curated educational reminders — not AI-generated, hand-written and fixed.
 * Rotates once per day (not per page navigation) so it stays consistent
 * across a single visit rather than changing every click.
 */
export const CARI_TIPS: string[] = [
  "Measurable goals are easier to monitor over time.",
  "Reviewing an IEP with another educator often catches small details.",
  "Remember that accommodations support access without changing learning expectations.",
  "A clear baseline makes it much easier to tell if a goal is actually being met.",
  "Present levels should connect directly to the goals that follow them.",
  "Modifications change what's being taught — use them deliberately, not by default.",
  "Specific, observable language (\"reads aloud\") is easier to track than vague language (\"improves reading\").",
  "Quarterly updates are a chance to confirm a goal is still the right one, not just to report progress.",
  "A goal that's realistic for the student's program is more useful than one that's ambitious on paper.",
  "Small, consistent notes each quarter are easier to act on than one long note at the end of the year.",
];

export function getDailyCariTip(date: Date = new Date()): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return CARI_TIPS[dayOfYear % CARI_TIPS.length];
}
