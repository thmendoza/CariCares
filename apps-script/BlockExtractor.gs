/**
 * BlockExtractor.gs
 *
 * Walks a Google Doc's body and reports its structure as a flat array of
 * plain-data "blocks" — headings, paragraphs, tables. This file only
 * reports facts (text, heading level, whether a paragraph is entirely
 * bold, table cell text). It does not decide what is an IEP section, does
 * not build HTML, and does not know anything about SectionType — that
 * classification happens entirely in CARe's server
 * (lib/parser/google-docs-normalizer.ts + lib/parser/section-detector.ts).
 *
 * Block shape (kept deliberately close to what DocumentService.gs already
 * returns as JSON, so no extra serialization step is needed):
 *
 *   { type: "heading", level: 1-6, text: string }
 *   { type: "paragraph", text: string, isEntireParagraphBold: boolean }
 *   { type: "table", rows: string[][] }
 *
 * EXTENSIBILITY (see docs/google-docs-bridge-milestone-2.md): the `type`
 * field is a discriminator, and future milestones are expected to add new
 * type values and new optional fields on existing block types WITHOUT
 * requiring a redesign of this contract — e.g. "list_item" (with listId /
 * nestingLevel), "image" (currently skipped entirely, not represented),
 * "page_break" (currently skipped), "bookmark" (currently skipped),
 * inline formatting spans (bold/italic/hyperlink runs) as an optional
 * `runs` array on paragraph/table-cell blocks, and checkbox state as an
 * optional field on paragraph blocks for lists rendered with checkboxes.
 * None of that is implemented here yet — only heading/paragraph/table are
 * emitted today, and list items are flattened into plain paragraph blocks
 * (their text only, no list semantics) so their content isn't silently
 * dropped in the meantime.
 */

/**
 * @typedef {{blocks: Object[], truncated: boolean}} BlockExtractionResult
 */

/**
 * @param {GoogleAppsScript.Document.Document} doc
 * @returns {BlockExtractionResult}
 */
function extractDocumentBlocks_(doc) {
  var body = doc.getBody();
  var numChildren = body.getNumChildren();

  var blocks = [];
  var totalChars = 0;
  var truncated = false;

  for (var i = 0; i < numChildren; i++) {
    if (blocks.length >= CONFIG_MAX_BLOCKS) {
      truncated = true;
      break;
    }

    var child = body.getChild(i);
    var block = blockFromElement_(child);
    if (!block) continue; // unrecognized/ignored element type (image, page break, etc.)

    var blockChars = blockCharCount_(block);
    if (totalChars + blockChars > CONFIG_MAX_BLOCKS_TOTAL_CHARS) {
      truncated = true;
      break;
    }

    blocks.push(block);
    totalChars += blockChars;
  }

  return { blocks: blocks, truncated: truncated };
}

/**
 * @param {GoogleAppsScript.Document.Element} element
 * @returns {Object|null} a block, or null if this element type is ignored
 */
function blockFromElement_(element) {
  var type = element.getType();

  if (type === DocumentApp.ElementType.PARAGRAPH) {
    return blockFromParagraph_(element.asParagraph());
  }
  if (type === DocumentApp.ElementType.LIST_ITEM) {
    // Flattened to plain text for now — see the EXTENSIBILITY note above.
    return blockFromListItem_(element.asListItem());
  }
  if (type === DocumentApp.ElementType.TABLE) {
    return blockFromTable_(element.asTable());
  }

  // Images, page breaks, bookmarks, horizontal rules, table of contents,
  // etc. — intentionally ignored for Milestone 2.
  return null;
}

function blockFromParagraph_(paragraph) {
  var text = truncateBlockText_(paragraph.getText());
  if (text.length === 0) return null; // skip blank paragraphs entirely

  var headingLevel = headingLevelFromParagraph_(paragraph);
  if (headingLevel !== null) {
    return { type: "heading", level: headingLevel, text: text };
  }

  return {
    type: "paragraph",
    text: text,
    isEntireParagraphBold: paragraphIsEntirelyBold_(paragraph),
  };
}

function blockFromListItem_(listItem) {
  var text = truncateBlockText_(listItem.getText());
  if (text.length === 0) return null;

  return {
    type: "paragraph",
    text: text,
    isEntireParagraphBold: textElementIsEntirelyBold_(listItem.editAsText()),
  };
}

function blockFromTable_(table) {
  var rows = [];
  var numRows = table.getNumRows();
  for (var r = 0; r < numRows; r++) {
    var row = table.getRow(r);
    var cells = [];
    var numCells = row.getNumCells();
    for (var c = 0; c < numCells; c++) {
      cells.push(truncateBlockText_(row.getCell(c).getText()));
    }
    rows.push(cells);
  }
  return { type: "table", rows: rows };
}

/**
 * Maps DocumentApp's heading styles to a 1-6 level, or null if this
 * paragraph isn't a real Heading-styled paragraph at all (most IEP
 * section headers in practice are NOT Heading-styled — they're a plain
 * paragraph that happens to be entirely bold, which is handled separately
 * by paragraphIsEntirelyBold_ / the "paragraph" block type).
 */
function headingLevelFromParagraph_(paragraph) {
  var heading = paragraph.getHeading();
  var H = DocumentApp.ParagraphHeading;
  switch (heading) {
    case H.TITLE:
      return 1;
    case H.SUBTITLE:
      return 2;
    case H.HEADING1:
      return 1;
    case H.HEADING2:
      return 2;
    case H.HEADING3:
      return 3;
    case H.HEADING4:
      return 4;
    case H.HEADING5:
      return 5;
    case H.HEADING6:
      return 6;
    default:
      return null; // NORMAL — not a heading
  }
}

function paragraphIsEntirelyBold_(paragraph) {
  return textElementIsEntirelyBold_(paragraph.editAsText());
}

/**
 * True only if every character in the given Text element is bold — a
 * paragraph with a bold label followed by plain text (e.g. "IEP Date: "
 * bold, "December 02, 2025" not) returns false here, matching the same
 * "entire run must be bold" rule the Word/.docx path already enforces in
 * lib/parser/section-detector.ts's heading regex.
 * @param {GoogleAppsScript.Document.Text} text
 */
function textElementIsEntirelyBold_(text) {
  var len = text.getText().length;
  if (len === 0) return false;

  var indices = text.getTextAttributeIndices();
  for (var i = 0; i < indices.length; i++) {
    if (text.isBold(indices[i]) !== true) return false;
  }
  return true;
}

function truncateBlockText_(text) {
  if (text.length > CONFIG_MAX_BLOCK_TEXT_CHARS) {
    return text.substring(0, CONFIG_MAX_BLOCK_TEXT_CHARS);
  }
  return text;
}

function blockCharCount_(block) {
  if (block.type === "table") {
    var total = 0;
    for (var r = 0; r < block.rows.length; r++) {
      for (var c = 0; c < block.rows[r].length; c++) {
        total += block.rows[r][c].length;
      }
    }
    return total;
  }
  return block.text ? block.text.length : 0;
}
