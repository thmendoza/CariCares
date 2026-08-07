/**
 * Shared "DocBlock" schema — the structured-facts contract between the
 * Apps Script bridge (apps-script/BlockExtractor.gs, which emits these)
 * and CARe's server (lib/parser/google-docs-normalizer.ts, which consumes
 * them). Neither side decides what an IEP section is here — this module
 * only describes and validates document *structure*.
 *
 * Milestone 2 emits exactly three block types: heading, paragraph, table.
 * The `type` discriminator is deliberately a plain string union so future
 * milestones can add new block types (e.g. "list_item" with listId /
 * nestingLevel, "image", "page_break", "bookmark") or new optional fields
 * on existing types (e.g. an inline `runs` array for bold/italic/hyperlink
 * spans, a `checked` field for checkbox-style list items) without
 * redesigning this contract or the bridge's response shape — see
 * docs/google-docs-bridge-milestone-2.md.
 */

export interface HeadingBlock {
  type: "heading";
  level: number; // 1-6
  text: string;
}

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
  isEntireParagraphBold?: boolean;
}

export interface TableBlock {
  type: "table";
  rows: string[][];
}

export type DocBlock = HeadingBlock | ParagraphBlock | TableBlock;

// Mirrors apps-script/Config.gs's CONFIG_MAX_BLOCKS / CONFIG_MAX_BLOCK_TEXT_CHARS /
// CONFIG_MAX_BLOCKS_TOTAL_CHARS — applied again here as defense in depth,
// both when parsing the Apps Script response and when validating a
// client-submitted blocks payload (see app/api/google-docs/parse-sections/route.ts).
export const MAX_BLOCKS = 5000;
export const MAX_BLOCK_TEXT_CHARS = 5000;
export const MAX_BLOCKS_TOTAL_CHARS = 200_000;

function isValidBlockShape(raw: unknown): raw is DocBlock {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Record<string, unknown>;

  if (b.type === "heading") {
    return typeof b.level === "number" && b.level >= 1 && b.level <= 6 && typeof b.text === "string";
  }
  if (b.type === "paragraph") {
    return (
      typeof b.text === "string" &&
      (b.isEntireParagraphBold === undefined || typeof b.isEntireParagraphBold === "boolean")
    );
  }
  if (b.type === "table") {
    return (
      Array.isArray(b.rows) &&
      b.rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"))
    );
  }
  // Unknown/future block type — safely ignored today rather than rejected
  // wholesale, so one unrecognized block never breaks the rest.
  return false;
}

function capBlockText(block: DocBlock): DocBlock {
  if (block.type === "table") {
    return {
      type: "table",
      rows: block.rows.map((row) => row.map((cell) => cell.slice(0, MAX_BLOCK_TEXT_CHARS))),
    };
  }
  if (block.text.length <= MAX_BLOCK_TEXT_CHARS) return block;
  return { ...block, text: block.text.slice(0, MAX_BLOCK_TEXT_CHARS) };
}

function blockCharCount(block: DocBlock): number {
  if (block.type === "table") {
    return block.rows.reduce((sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell.length, 0), 0);
  }
  return block.text.length;
}

/**
 * Pure validation/normalization for a raw (already JSON-parsed) blocks
 * array — used both for the Apps Script bridge response and for
 * client-submitted blocks in /api/google-docs/parse-sections. Invalid
 * individual entries are silently dropped (this is best-effort preview
 * data, not a security boundary); array length and combined text size are
 * capped, matching the same caps Apps Script itself enforces.
 */
export function parseDocBlocks(raw: unknown): { blocks: DocBlock[]; truncated: boolean } {
  if (!Array.isArray(raw)) return { blocks: [], truncated: false };

  const blocks: DocBlock[] = [];
  let totalChars = 0;
  let truncated = false;

  for (const item of raw) {
    if (blocks.length >= MAX_BLOCKS) {
      truncated = true;
      break;
    }
    if (!isValidBlockShape(item)) continue;

    const capped = capBlockText(item);
    const chars = blockCharCount(capped);
    if (totalChars + chars > MAX_BLOCKS_TOTAL_CHARS) {
      truncated = true;
      break;
    }

    blocks.push(capped);
    totalChars += chars;
  }

  return { blocks, truncated };
}
