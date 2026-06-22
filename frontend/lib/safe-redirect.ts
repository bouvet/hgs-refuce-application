/**
 * Sanitize a `?redirect=` query value into a safe, same-origin relative path.
 *
 * Prevents open redirects: only a path that starts with a single "/" (and not
 * "//" or "/\", which browsers treat as protocol-relative external URLs) is
 * allowed. Anything else — absolute URLs, missing values, arrays — returns null
 * so callers fall back to a safe default destination.
 */
export function sanitizeRedirect(
  value: string | string[] | undefined | null,
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}
