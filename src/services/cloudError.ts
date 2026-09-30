const SUPABASE_UNAVAILABLE_PATTERNS = [
  "failed to fetch",
  "fetch failed",
  "network request failed",
  "unknownhostexception",
  "unable to resolve host",
  "no address associated with hostname",
  "project is paused",
  "project paused",
  "service unavailable",
  "gateway timeout",
  "status 503",
  "status 521",
  "status 522",
  "status 523",
];

const ERROR_TEXT_KEYS = [
  "name",
  "message",
  "error",
  "error_description",
  "details",
  "hint",
  "code",
  "status",
  "cause",
] as const;

export function getCloudErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "알 수 없는 오류가 발생했어요.";
}

export function isLikelySupabaseUnavailableError(error: unknown) {
  const errorText = collectErrorText(error).toLowerCase();

  return SUPABASE_UNAVAILABLE_PATTERNS.some((pattern) =>
    errorText.includes(pattern)
  );
}

function collectErrorText(
  value: unknown,
  seen = new Set<object>(),
  depth = 0
): string {
  if (value === null || value === undefined || depth > 4) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (typeof value !== "object" || seen.has(value)) {
    return "";
  }

  seen.add(value);

  const record = value as Record<string, unknown>;
  return ERROR_TEXT_KEYS.map((key) =>
    collectErrorText(record[key], seen, depth + 1)
  )
    .filter(Boolean)
    .join(" ");
}
