export function buildSectionPrompt(params: {
  sectionType: string;
  sectionTitle: string;
  plainText: string;
  program: string;
  rubric: string;
}): string {
  return `You are an expert Special Education (SPED) coordinator reviewing an IEP section for quality and compliance.

## Student Program
${params.program.replace(/_/g, " ")}

## Program Rubric
${params.rubric}

## Section Being Reviewed
Section type: ${params.sectionType.replace(/_/g, " ")}
Section title: ${params.sectionTitle}

## Section Text
${params.plainText}

## Instructions
Review the section text against the rubric criteria for this program. Identify any issues, gaps, or concerns.

For each issue found, return a JSON object with:
- "category": a short snake_case label (e.g. "missing_goal", "program_alignment", "clarity", "measurable_goal", "grammar", "missing_required_element", "internal_consistency", "transition_plan", "diagnosis_appropriateness", "duplicate_phrasing", "formatting", "word_choice")
- "highlightText": the exact verbatim substring from the section text that contains the issue (max 100 characters, must appear word-for-word in the text above)
- "recommendation": a specific, actionable suggestion to fix the issue (1-2 sentences)
- "stake": "HIGH" if this is a serious concern (missing required elements, wrong program alignment, non-measurable goals, legal compliance), "LOW" if minor (grammar, vague phrasing, formatting)

Return a JSON array. If no issues are found, return [].
Return ONLY the JSON array with no markdown formatting, no code fences, no explanation.

Example:
[{"category":"missing_goal","highlightText":"John will improve reading","recommendation":"This goal lacks a measurable target and baseline. Specify a starting level and expected level of performance by year-end.","stake":"HIGH"},{"category":"clarity","highlightText":"as appropriate","recommendation":"Replace vague language with specific conditions and criteria for when this accommodation applies.","stake":"LOW"}]`;
}
