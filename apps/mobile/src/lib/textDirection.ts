import { parseMarkdownDocument, type MarkdownNode } from "./markdownDocument";

export type TextDirection = "ltr" | "rtl";

const LETTER_CHARACTER = /^\p{Letter}$/u;
const RTL_SCRIPT_CHARACTER =
  /^[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff\u{10800}-\u{10fff}\u{1e800}-\u{1eeff}]$/u;
const GITHUB_ALERT_MARKER = /\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/giu;

function markdownProse(node: MarkdownNode): string {
  if (node.type === "inlineCode" || node.type === "code" || node.type === "image") {
    return "";
  }

  if (node.type === "text") {
    return node.value.replace(GITHUB_ALERT_MARKER, "");
  }

  return "children" in node ? node.children.map(markdownProse).join("") : "";
}

export function resolveTextDirection(text: string): TextDirection {
  for (const character of text) {
    if (!LETTER_CHARACTER.test(character)) continue;
    return RTL_SCRIPT_CHARACTER.test(character) ? "rtl" : "ltr";
  }
  return "ltr";
}

export function resolveMarkdownNodeTextDirection(node: MarkdownNode): TextDirection {
  return resolveTextDirection(markdownProse(node));
}

export function resolveMarkdownTextDirection(markdown: string): TextDirection {
  return resolveMarkdownNodeTextDirection(parseMarkdownDocument(markdown));
}
