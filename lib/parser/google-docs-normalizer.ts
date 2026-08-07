/**
 * Converts Google Docs structured blocks (lib/google-docs/blocks.ts) into
 * the same lightweight HTML shape lib/parser/section-detector.ts already
 * expects from the Word/.docx path (via mammoth.ts). This lets
 * detectSections() stay the single source of truth for section detection
 * — Google Docs and Word uploads both normalize to HTML first, then
 * converge on the same detector:
 *
 *   DOCX        → mammoth.ts (docxToHtml)          → normalized HTML → detectSections()
 *   Google Docs → google-docs-normalizer.ts (this) → normalized HTML → detectSections()
 *
 * Deliberately minimal: only the three signals detectSections() actually
 * looks for are produced — a real heading tag, a paragraph that's
 * entirely one bold run, or a short bare paragraph. Everything else
 * (isEntireParagraphBold === false, tables) becomes plain body content,
 * matching how mammoth's output is treated for those cases today.
 */

import type { DocBlock } from "@/lib/google-docs/blocks";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function blockToHtml(block: DocBlock): string {
  if (block.type === "heading") {
    const level = Math.min(Math.max(Math.trunc(block.level), 1), 6);
    const text = escapeHtml(block.text);
    return `<h${level}>${text}</h${level}>`;
  }

  if (block.type === "paragraph") {
    const text = escapeHtml(block.text);
    return block.isEntireParagraphBold ? `<p><strong>${text}</strong></p>` : `<p>${text}</p>`;
  }

  // table — flattened to a plain HTML table, matching the current fidelity
  // of the Word path (mammoth's table HTML isn't semantically parsed by
  // detectSections() either; it's treated as body content). Full semantic
  // table extraction is deferred to a later milestone.
  const rowsHtml = block.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table>${rowsHtml}</table>`;
}

/**
 * Pure — no I/O. Safe to unit test directly.
 */
export function normalizeBlocksToHtml(blocks: DocBlock[]): string {
  return blocks.map(blockToHtml).join("");
}
