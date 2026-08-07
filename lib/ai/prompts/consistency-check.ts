export function buildConsistencyPrompt(
  sections: Array<{ sectionType: string; plainText: string }>
): string {
  const sectionsText = sections
    .map((s) => `### ${s.sectionType.replace(/_/g, " ")}\n${s.plainText}`)
    .join("\n\n");

  return `You are an expert Special Education (SPED) coordinator reviewing an entire IEP for cross-section consistency.

## IEP Sections
${sectionsText}

## Instructions
Check the IEP as a whole for internal consistency issues. Specifically look for:
- Present Level of Performance findings that are not reflected in Annual Goals (e.g. a deficit is identified but no corresponding goal is written)
- Accommodations or modifications that don't match the needs described in Background History or PLOP
- Goals mentioned in one section that contradict or are missing from another section
- Discrepancies in how the student's needs are described across sections
- Services mentioned in one section but absent from another where they should appear

For each inconsistency found, return a JSON object with:
- "category": use "internal_consistency" for cross-section mismatches, or a more specific label if appropriate
- "highlightText": the exact verbatim phrase from any section that illustrates the problem (max 100 characters, must appear word-for-word in the text above)
- "recommendation": a specific suggestion to resolve the inconsistency (1-2 sentences)
- "stake": "HIGH" for significant inconsistencies that undermine the IEP's integrity, "LOW" for minor discrepancies

Return a JSON array. If the IEP is internally consistent, return [].
Return ONLY the JSON array with no markdown formatting, no code fences, no explanation.`;
}
