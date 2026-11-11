# ADR 0002 — Server-first rendering for reader experiences

- Status: Accepted
- Date: 2026-11-10

## Decision

Use Next.js App Router Server Components for publication home, article, category, tag and author pages. Reserve Client Components for search, galleries, save-state, reading progress and CMS interactions.

## Rationale

Editorial pages are primarily read, not manipulated. Server-first rendering reduces client JavaScript, improves first content delivery and keeps data access close to the server. Suspense isolates non-critical recommendation content.

## Trade-offs

Interactive features require explicit client boundaries and hydration QA. Cache invalidation must follow editorial mutations so the reader-facing pages do not remain stale beyond the intended revalidation window.
