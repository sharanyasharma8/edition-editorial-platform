# ADR 0001 — One platform, multiple publication identities

- Status: Accepted
- Date: 2026-11-10

## Decision

Use one Next.js application with two brand configurations (`edit` and `form`) and shared components. Brand-specific tokens/layout classes define publication identity; content carries a publication slug.

## Rationale

This keeps routing, content retrieval, caching, accessibility behavior and editorial operations consistent while allowing distinct art direction. A separate app per publication would duplicate operational logic and make shared design-system improvements harder to maintain.

## Trade-offs

Brand configuration and components must avoid accidental coupling. Shared components need explicit variants and visual regression checks to preserve each publication's individuality.
