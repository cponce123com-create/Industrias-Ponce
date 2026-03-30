/**
 * Parses `page` and `limit` from a query-string object and returns
 * the sanitised values plus the derived `offset`.
 *
 * - page  : 1-based, defaults to 1, minimum 1
 * - limit : defaults to 50, clamped to [1, 500]
 */
export function parsePagination(q: Record<string, unknown>): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(String(q.page ?? "1"), 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(String(q.limit ?? "50"), 10) || 50));
  return { page, limit, offset: (page - 1) * limit };
}
