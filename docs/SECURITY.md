# Security notes and production checklist

## Included safeguards

- HTTP-only, `SameSite=Lax` session cookie with an eight-hour expiry.
- Production requires `SESSION_SECRET` with at least 32 characters.
- DB-backed accounts use scrypt password hashes and timing-safe verification.
- Public GraphQL content resolvers expose published stories only, with per-client rate limits and bounded request, page-size and search arguments.
- CMS routes enforce author ownership and editor-only publishing.
- Cookie-authenticated mutation routes check `Origin` against `NEXT_PUBLIC_SITE_URL`.
- Login and AI operations use Redis-backed fixed-window limits. In production, a missing/unavailable Redis rate limiter fails closed; local process-level fallback is limited to development and explicit demo-auth environments.
- Media uploads require editor permissions, have a 5 MB size cap, allow-list image types, and validate file signatures. Article image URLs are restricted to the dynamic local-media handler and supported HTTPS image/CDN hosts. Local reads accept only generated UUID filenames; metadata-write failures attempt to roll back the file or S3 object.
- The FastAPI service supports a shared bearer token and is not published as a host port in Docker Compose.
- S3 media storage is private by default; CloudFront uses Origin Access Control.

## Before any public production deployment

1. Set unique, long secrets for `SESSION_SECRET`, `CRON_SECRET`, `AI_SERVICE_TOKEN`, database credentials and initial user credentials in AWS Secrets Manager. Never use the local Compose defaults.
2. Use HTTPS with an ACM certificate and a custom domain. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin.
3. Disable public demo authentication. In DB mode, provision initial editor/admin accounts through a controlled bootstrap procedure and rotate their passwords after handoff.
4. Review trusted proxy behavior. The rate limiter reads `x-forwarded-for`; the ALB/edge must overwrite inbound client-supplied forwarding headers.
5. Set restrictive S3 bucket policy, CloudFront OAC, encryption and lifecycle rules. Confirm legal rights/credits for every image.
6. Configure database backups, point-in-time recovery, Redis authentication/TLS, secret rotation and least-privilege IAM.
7. Add WAF/rate controls at the edge and monitor auth failures, 4xx/5xx, latency, queue saturation and AI-provider spend.
8. External AI processing is disabled by default. Enabling provider-backed AI requires an operator-controlled `AI_EXTERNAL_PROCESSING_ENABLED=true` policy flag and explicit per-request editor consent. The service gates both embeddings and generation on both controls. Review privacy, retention, data-processing terms and editor training before enabling it; demo mode makes no external model call.
9. Perform dependency, container and penetration testing. This repository does not claim to have completed a formal security assessment.

## Known boundaries

- Local JSON mode and its process-local rate-limit fallback are single-instance demo conveniences, not durable production services. Do not enable `ENABLE_DEMO_AUTH` in public production.
- Editor/author bootstrap credentials are seeded from environment variables; operational provisioning and password-reset flows still need an identity lifecycle.
- AI prompt-injection resistance and factual reliability require ongoing red-team evaluation; model output is not automatically trustworthy.
- `/api/health/live` is a liveness check; `/api/health` requires durable PostgreSQL, Redis and the configured AI sidecar for production readiness. Local JSON demo mode may omit PostgreSQL/Redis. Private draft previews require an authenticated owner/editor session and carry `noindex` metadata.
