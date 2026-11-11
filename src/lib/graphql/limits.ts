/** Guardrails shared by the public GraphQL schema and its resolver tests. */
export const GRAPHQL_DEFAULT_PAGE_SIZE = 24;
export const GRAPHQL_MAX_PAGE_SIZE = 48;
export const GRAPHQL_MAX_SEARCH_LENGTH = 120;

export function normalizePageSize(limit?: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return GRAPHQL_DEFAULT_PAGE_SIZE;
  return Math.min(GRAPHQL_MAX_PAGE_SIZE, Math.max(1, Math.trunc(limit)));
}

export function normalizeSearchTerm(query?: string): string | undefined {
  if (query === undefined) return undefined;
  const normalized = query.trim().slice(0, GRAPHQL_MAX_SEARCH_LENGTH);
  return normalized || undefined;
}
