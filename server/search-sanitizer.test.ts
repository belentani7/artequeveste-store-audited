import { describe, expect, it } from "vitest";
import { safeSearchTerm } from "./routers/commerce";

describe("sanitized storefront search", () => {
  it("keeps useful product terms", () => {
    expect(safeSearchTerm.parse("   vestido azul  ")).toBe("vestido azul");
    expect(safeSearchTerm.parse(" vestido:3XL ")).toBe("vestido 3XL");
  });

  it("rejects operator-only searches that sanitize to empty", () => {
    expect(safeSearchTerm.safeParse(": * ( ) -").success).toBe(false);
    expect(safeSearchTerm.safeParse("   ").success).toBe(false);
    expect(safeSearchTerm.safeParse("<<>>").success).toBe(false);
  });
});
