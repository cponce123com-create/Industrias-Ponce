import type { ZodError } from "zod";
import { ApiError } from "./error";

/**
 * Validates a data object against a Zod schema.
 * Throws an ApiError(400) with a combined message if validation fails.
 * @param schema - A Zod schema (must have a `safeParse` method)
 * @returns A function that takes raw data and returns the parsed data if valid
 */
export function validateBody<T>(
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: ZodError } },
) {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const messages = result.error!.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      throw new ApiError(400, messages.join("; "), "VALIDATION_ERROR");
    }
    return result.data!;
  };
}