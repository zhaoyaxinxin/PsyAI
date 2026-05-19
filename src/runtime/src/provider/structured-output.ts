/**
 * Structured output validation — validates LLM outputs against expected schemas.
 * Provider-agnostic: works on any JSON-serializable output.
 */

export interface StructuredOutputSchema {
  schemaId: string;
  schemaVersion: string;
  requiredFields: string[];
  fieldTypes?: Record<string, "string" | "number" | "boolean" | "array" | "object">;
  allowExtraFields?: boolean;
}

export interface OutputValidationResult {
  valid: boolean;
  issues: string[];
  schemaId: string;
  schemaVersion: string;
}

function fieldTypeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Validate a structured output against a schema definition.
 *
 * Checks required field presence and optional type constraints.
 * Does NOT perform deep object validation — only shallow field-level checks.
 */
export function validateStructuredOutput(
  output: Record<string, unknown>,
  schema: StructuredOutputSchema
): OutputValidationResult {
  const issues: string[] = [];

  for (const field of schema.requiredFields) {
    if (!(field in output) || output[field] === undefined) {
      issues.push(`Missing required field '${field}'`);
      continue;
    }

    if (schema.fieldTypes) {
      const expectedType = schema.fieldTypes[field];
      if (expectedType) {
        const actualType = fieldTypeOf(output[field]);
        if (actualType !== expectedType) {
          issues.push(
            `Field '${field}' expected type '${expectedType}' but got '${actualType}'`
          );
        }
      }
    }
  }

  if (!schema.allowExtraFields) {
    const knownFields = new Set(schema.requiredFields);
    for (const key of Object.keys(output)) {
      if (!knownFields.has(key)) {
        issues.push(`Unexpected extra field '${key}'`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    schemaId: schema.schemaId,
    schemaVersion: schema.schemaVersion
  };
}

/**
 * Parse a raw string or object into a Record for validation.
 * Returns null when the input cannot be parsed into a flat record.
 */
export function coerceToRecord(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Validate and coerce: parse raw output, then validate against schema.
 */
export function validateRawOutput(
  raw: unknown,
  schema: StructuredOutputSchema
): { record: Record<string, unknown>; validation: OutputValidationResult } | null {
  const record = coerceToRecord(raw);
  if (!record) return null;

  return {
    record,
    validation: validateStructuredOutput(record, schema)
  };
}
