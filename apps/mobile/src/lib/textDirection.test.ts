import type { Root, RootContent } from "mdast";
import { describe, expect, it } from "vite-plus/test";

import {
  resolveMarkdownNodeTextDirection,
  resolveMarkdownTextDirection,
  resolveTextDirection,
} from "./textDirection";

const documentWith = (...children: RootContent[]): Root => ({
  type: "root",
  children,
});

describe("resolveTextDirection", () => {
  it("resolves Hebrew and Arabic text as right-to-left", () => {
    expect(resolveTextDirection("הודעה בעברית")).toBe("rtl");
    expect(resolveTextDirection("رسالة بالعربية")).toBe("rtl");
  });

  it("resolves English and other left-to-right scripts as left-to-right", () => {
    expect(resolveTextDirection("English message")).toBe("ltr");
    expect(resolveTextDirection("日本語のメッセージ")).toBe("ltr");
  });

  it("ignores neutral prefixes before the first letter", () => {
    expect(resolveTextDirection("👋 123... שלום")).toBe("rtl");
    expect(resolveTextDirection("(123) Hello")).toBe("ltr");
  });

  it("defaults neutral-only content to left-to-right", () => {
    expect(resolveTextDirection("👋 123...")).toBe("ltr");
  });

  it("uses parsed prose instead of code content", () => {
    expect(
      resolveMarkdownNodeTextDirection(
        documentWith(
          { type: "code", value: "npm test" },
          {
            type: "paragraph",
            children: [
              { type: "inlineCode", value: "English inline code" },
              { type: "text", value: " שלום" },
            ],
          },
        ),
      ),
    ).toBe("rtl");

    expect(
      resolveMarkdownNodeTextDirection(
        documentWith({
          type: "paragraph",
          children: [
            { type: "inlineCode", value: "שלום" },
            { type: "text", value: " English prose" },
          ],
        }),
      ),
    ).toBe("ltr");
  });

  it("ignores synthesized GitHub alert markers", () => {
    expect(
      resolveMarkdownNodeTextDirection(
        documentWith({
          type: "blockquote",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "[!NOTE] הודעת התראה בעברית." }],
            },
          ],
        }),
      ),
    ).toBe("rtl");
  });
});

describe("resolveMarkdownTextDirection", () => {
  it("resolves message prose after code, images, and alert markers", () => {
    expect(resolveMarkdownTextDirection("```sh\nnpm test\n```\n\n`English` שלום")).toBe("rtl");
    expect(
      resolveMarkdownTextDirection("![English](image.png)\n\n> [!NOTE]\n> رسالة بالعربية"),
    ).toBe("rtl");
    expect(resolveMarkdownTextDirection("`שלום` English prose")).toBe("ltr");
    expect(resolveMarkdownTextDirection("```sh\nnpm test\n```")).toBe("ltr");
  });
});
