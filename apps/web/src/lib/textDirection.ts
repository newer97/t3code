import type { ExtraProps } from "react-markdown";

export type TextDirection = "ltr" | "rtl";

type MarkdownNode = NonNullable<ExtraProps["node"]>;
type MarkdownChild = MarkdownNode["children"][number];

const LETTER_CHARACTER = /\p{Letter}/u;
const RTL_SCRIPT_CHARACTER = /[֐-ࣿיִ-﷿ﹰ-﻿\u{10800}-\u{10fff}\u{1e800}-\u{1eeff}]/u;

function markdownProse(node: MarkdownNode | MarkdownChild): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element" || node.tagName === "code" || node.tagName === "pre") return "";
  return node.children.map(markdownProse).join(" ");
}

/**
 * Direction from the first strong letter, matching how the browser resolves a
 * `dir="auto"` or `unicode-bidi: plaintext` paragraph.
 */
export function resolveFirstStrongTextDirection(text: string): TextDirection {
  for (const character of text) {
    if (!LETTER_CHARACTER.test(character)) continue;
    return RTL_SCRIPT_CHARACTER.test(character) ? "rtl" : "ltr";
  }
  return "ltr";
}

/**
 * Picks the direction whose letters dominate. Tables mix scripts freely (an
 * Arabic table full of product names), so first-strong-character detection
 * flips on a single leading Latin term; a majority vote does not.
 */
export function resolveDominantTextDirection(text: string): TextDirection {
  let rtl = 0;
  let ltr = 0;
  for (const character of text) {
    if (!LETTER_CHARACTER.test(character)) continue;
    if (RTL_SCRIPT_CHARACTER.test(character)) rtl += 1;
    else ltr += 1;
  }
  return rtl > ltr ? "rtl" : "ltr";
}

/** Direction for a rendered markdown table, ignoring code inside its cells. */
export function resolveMarkdownTableDirection(node: MarkdownNode | undefined): TextDirection {
  return node ? resolveDominantTextDirection(markdownProse(node)) : "ltr";
}
