import { describe, expect, it } from "vitest";
import { createValidationEnvelope, isAllowedStateTransition, productInputSchema, sanitizeText } from "../shared/pvcu";

describe("PVC-U ecommerce-safe profile", () => {
  it("creates a valid validation envelope with traceability", () => {
    const envelope = createValidationEnvelope("trace-test-123", "PASSED", ["PVC-1xx"]);
    expect(envelope.profile).toBe("ecommerce-safe");
    expect(envelope.validationStatus).toBe("PASSED");
    expect(envelope.traceId).toBe("trace-test-123");
  });

  it("sanitizes angle brackets and control characters", () => {
    expect(sanitizeText(" <script>alert(1)</script> \n produto ")).toBe("scriptalert(1)/script  produto");
  });

  it("validates product input and rejects empty titles", () => {
    expect(productInputSchema.safeParse({ title: "Bolsa", price: 99 }).success).toBe(true);
    expect(productInputSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("enforces allowed UI transitions", () => {
    expect(isAllowedStateTransition("idle", "loading")).toBe(true);
    expect(isAllowedStateTransition("success", "error")).toBe(false);
  });
});
