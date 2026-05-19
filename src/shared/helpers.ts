import { z, type ZodType } from "zod";

/**
 * Lightweight synchronous schema parse that never throws.
 * Returns `{ ok: true, value }` on success, `{ ok: false, error }` on failure.
 */
export function safeParse<T>(
  schema: ZodType<T>,
  value: unknown
): { ok: true; value: T } | { ok: false; error: z.ZodError } {
  const result = schema.safeParse(value);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error };
}

/**
 * Lightweight asynchronous schema parse that never throws.
 * Returns `{ ok: true, value }` on success, `{ ok: false, error }` on failure.
 */
export async function safeParseAsync<T>(
  schema: ZodType<T>,
  value: unknown
): Promise<{ ok: true; value: T } | { ok: false; error: z.ZodError }> {
  const result = await schema.safeParseAsync(value);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error };
}

/**
 * Narrow `T | null | undefined` to `T`.
 * Useful for filtering collections or guarding optional values.
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// ── Shared validation helpers (Zod schemas for common patterns) ─────

export const nonEmptyStringSchema = z.string().min(1);
export const positiveIntSchema = z.number().int().positive();
export const nonNegativeIntSchema = z.number().int().nonnegative();
export const urlLikeStringSchema = z.string().min(1).refine(
  (v) => v === "" || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("file://"),
  { message: "must be empty or start with http://, https://, or file://" }
);
export const optionalBooleanSchema = z.boolean().optional();
export const tagsSchema = z.array(z.string().min(1)).max(10);
export const pageRequestSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional()
});
