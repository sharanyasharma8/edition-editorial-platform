# EDITION API notes

## GraphQL

Endpoint: `GET|POST /api/graphql`

Reader-facing schema:

```graphql
query HomeFeed($brand: String!, $limit: Int!) {
  articles(brand: $brand, limit: $limit) {
    id slug brand title dek category tags heroImage heroAlt imageCredit
    author { name slug role avatar }
    publishedAt readMinutes featured status
  }
}
```

`articles` intentionally has no `status` filter. Every GraphQL content resolver requests `PUBLISHED`, preventing draft/review/scheduled editorial content from leaking through the public query surface. Public requests are limited to 120 per minute per client, request sizes are bounded, page sizes are clamped to 1–48, and search terms are capped at 120 characters. Studio mutations stay in the authenticated REST API.

## REST

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public, rate limited | Authenticate configured or persisted account |
| POST | `/api/auth/logout` | Session + same-origin | Clear session cookie |
| GET | `/api/cms/articles` | Session | List all stories for editors; own stories for authors |
| POST | `/api/cms/articles` | Session + same-origin | Create draft/review story |
| PATCH | `/api/cms/articles/:id` | Owner or editor + same-origin | Update story and create a version snapshot |
| POST | `/api/cms/articles/:id/publish` | Editor/admin + same-origin | Publish a story |
| GET | `/api/cms/articles/:id/versions` | Owner or editor | Read version history |
| GET | `/studio/stories/:id/preview` | Owner or editor session | Render a private, noindex preview of an unpublished story |
| GET/POST | `/api/cms/media` | Session; editor for upload | Browse/upload editorial media and persist asset metadata |
| GET | `/api/media/:filename` | Public immutable asset URL | Serve validated local uploads from the runtime volume |
| POST | `/api/assistant` | Session + same-origin + quota | Request structured editorial suggestions |
| POST | `/api/assistant/stream` | Session + same-origin + quota | Stream an editorial note |
| POST | `/api/internal/publish-scheduled` | `CRON_SECRET` bearer | Promote due stories |
| GET | `/api/health` | Public | Readiness check for configured PostgreSQL and Redis dependencies |
| GET | `/api/health/live` | Public | Process liveness check |
| GET | `/robots.txt`, `/sitemap.xml` | Public | Search discovery metadata; studio and API routes are disallowed |

## Error contract

Validation errors use HTTP 400 with a stable `error` message and, where relevant, Zod field details. Missing authentication returns 401; insufficient permission or invalid origin returns 403; rate limiting returns 429 with `Retry-After`; unavailable dependencies return 503. Clients should treat error text as user-facing guidance, not as a machine-readable code.
