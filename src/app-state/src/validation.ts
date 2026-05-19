interface SafeParseSchema {
  safeParse(value: unknown): {
    success: boolean;
  };
}

export function assertNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

export function assertOneOf<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName: string
): asserts value is T {
  if (!allowedValues.includes(value as T)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }
}

export function assertSchemaValue(
  schema: SafeParseSchema,
  value: unknown,
  message: string
): void {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(message);
  }
}

export function assertOptionalBoolean(
  value: unknown,
  fieldName: string
): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== "boolean") {
    throw new Error(`${fieldName} must be boolean when provided`);
  }
}
