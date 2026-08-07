import { parse, HTMLElement, TextNode, type Node as HtmlNode } from "node-html-parser";

export interface HighlightMark {
  id: string;
  text: string;
}

// Below this length a match is too ambiguous to trust (e.g. a lone word could
// match the wrong occurrence in a long section).
const MIN_MATCH_LENGTH = 10;

// Inline style, not a Tailwind class — `lib/**` isn't in tailwind.config.ts's
// content globs, so a class string here would get purged in production builds.
const MARK_STYLE =
  "background:#FBCFE8;border-radius:3px;padding:0 2px;scroll-margin-top:5rem;";

export function injectHighlightMarks(
  rawHtml: string,
  marks: HighlightMark[]
): { html: string; matchedIds: Set<string> } {
  const matchedIds = new Set<string>();
  const candidates = marks.filter((m) => m.text && m.text.trim().length >= MIN_MATCH_LENGTH);
  if (candidates.length === 0) return { html: rawHtml, matchedIds };

  let root: HTMLElement;
  try {
    root = parse(rawHtml);
  } catch {
    return { html: rawHtml, matchedIds };
  }

  for (const mark of candidates) {
    try {
      if (findAndWrap(root, mark.text.trim(), mark.id)) {
        matchedIds.add(mark.id);
      }
    } catch {
      // Never let one bad match take down the whole section render.
    }
  }

  return { html: root.toString(), matchedIds };
}

function findAndWrap(node: HTMLElement, target: string, id: string): boolean {
  for (const child of node.childNodes) {
    if (child instanceof TextNode) {
      const idx = child.rawText.indexOf(target);
      if (idx !== -1) {
        wrapTextNode(node, child, idx, target.length, id);
        return true;
      }
    } else if (child instanceof HTMLElement) {
      if (findAndWrap(child, target, id)) return true;
    }
  }
  return false;
}

function wrapTextNode(
  parent: HTMLElement,
  textNode: TextNode,
  start: number,
  length: number,
  id: string
): void {
  const raw = textNode.rawText;
  const before = raw.slice(0, start);
  const matchText = raw.slice(start, start + length);
  const after = raw.slice(start + length);

  const index = parent.childNodes.indexOf(textNode);
  if (index === -1) return;

  const markFragment = parse(
    `<mark id="flag-${id}" data-flag-id="${id}" style="${MARK_STYLE}">${matchText}</mark>`
  );
  const markEl = markFragment.childNodes[0];
  markEl.parentNode = parent;

  const replacement: HtmlNode[] = [];
  if (before) replacement.push(new TextNode(before, parent));
  replacement.push(markEl);
  if (after) replacement.push(new TextNode(after, parent));

  parent.childNodes.splice(index, 1, ...replacement);
}
