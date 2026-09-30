import { describe, expect, it } from "vite-plus/test";

import { resolveDominantTextDirection, resolveFirstStrongTextDirection } from "./textDirection";

describe("resolveFirstStrongTextDirection", () => {
  it("follows the first letter and skips punctuation and digits", () => {
    expect(resolveFirstStrongTextDirection("https://example.com وش الفرق")).toBe("ltr");
    expect(resolveFirstStrongTextDirection("2. وش الفرق عن WSL2؟")).toBe("rtl");
    expect(resolveFirstStrongTextDirection("")).toBe("ltr");
  });
});

describe("resolveDominantTextDirection", () => {
  it("keeps an Arabic table RTL when it starts with a Latin term", () => {
    expect(resolveDominantTextDirection("WSL Containers الجديد حاويات من صور جاهزة")).toBe("rtl");
  });

  it("keeps an English table LTR with a stray RTL cell", () => {
    expect(resolveDominantTextDirection("Name Description test בדיקה")).toBe("ltr");
  });
});
