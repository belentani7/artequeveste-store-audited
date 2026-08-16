import { z } from "zod";

export const PVCU_VERSION = "1.0.0";
export const CLIENT_VERSION = "artequeveste-web/1.0.0";

export const traceIdSchema = z.string().regex(/^[a-zA-Z0-9._:-]{8,128}$/);
export const validationStatusSchema = z.enum(["PASSED", "FAILED"]);

export const validationEnvelopeSchema = z.object({
  validationStatus: validationStatusSchema,
  validationId: z.string().min(8),
  traceId: traceIdSchema,
  profile: z.literal("ecommerce-safe"),
  version: z.literal(PVCU_VERSION),
  codes: z.array(z.string()),
  timestamp: z.string().datetime(),
});

export type ValidationEnvelope = z.infer<typeof validationEnvelopeSchema>;

export const productInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  price: z.number().nonnegative().finite().optional(),
});

export const consentSchema = z.object({
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  version: z.string().min(1).max(24),
});

export function createTraceId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid ?? `trace-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createValidationEnvelope(
  traceId: string,
  status: ValidationEnvelope["validationStatus"],
  codes: string[] = [],
): ValidationEnvelope {
  return {
    validationStatus: status,
    validationId: `validation-${createTraceId()}`,
    traceId,
    profile: "ecommerce-safe",
    version: PVCU_VERSION,
    codes,
    timestamp: new Date().toISOString(),
  };
}

export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function isAllowedStateTransition(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    idle: ["loading"],
    loading: ["success", "error"],
    error: ["loading", "idle"],
    success: ["idle", "loading"],
  };
  return transitions[from]?.includes(to) ?? false;
}
