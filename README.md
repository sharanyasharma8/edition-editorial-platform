# EDITION — Multi-brand editorial publishing platform

EDITION is a portfolio-grade prototype of a shared publishing platform for two fictional editorial brands:

- **THE EDIT** (`/edit`) — fashion, beauty, culture and lifestyle.
- **FORM** (`/form`) — architecture, interiors, art and design.

The repository contains a Next.js App Router application, a FastAPI editorial-assistant service, a Prisma/PostgreSQL schema and seed data, reader-facing GraphQL and studio REST APIs, a Storybook setup, unit/e2e test suites, Docker orchestration, GitHub Actions and an AWS Terraform deployment path.

> **Verification status (11 November 2026):** TypeScript typecheck, ESLint, all 16 unit tests, all 9 Playwright E2E tests, and the Next.js production build passed locally. The Storybook production build completed with bundle-size/deprecation warnings. Docker Compose integration, Lighthouse measurements, desktop/tablet/mobile visual review, accessibility audit, infrastructure validation, and deployment remain unverified. This is not a production-readiness claim. See [QA_STATUS.md](./docs/QA_STATUS.md) for evidence and limits.

## Stack in this snapshot

- Next.js 15 App Router, React 19, TypeScript
- Server Components for reader-facing publication pages
- GraphQL Yoga endpoint at `/api/graphql`
- REST route handlers for authentication, CMS, media and AI proxy operations
- Prisma schema and SQL migration for PostgreSQL
- Optional Redis cache integration
- FastAPI AI service with deterministic demo mode and optional OpenAI integration
- Vitest, React Testing Library, Playwright and Storybook configuration
- Dockerfiles and Docker Compose for local multi-service orchestration

## Quick start: web application

Requirements: Node.js 20+ and npm. PostgreSQL and Redis are optional for the file-backed local demo mode; both are required for production readiness. The configured FastAPI assistant sidecar is also required for production readiness.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3001`. The root route redirects to `/edit`.

### Demo CMS accounts

For the file-backed local demo, the login route uses environment-configurable demo accounts:

| Role | Email | Password |
|---|---|---|
| Editor | `editor@edition.studio` | `edition-demo-pass` |
| Author | `author@edition.studio` | `author-demo-pass` |

The demo credentials are local-only. In database mode, `prisma/seed.ts` provisions the same accounts with scrypt password hashes from the environment variables; change both values before deployment and retrieve bootstrap credentials through your secret manager. The production login path authenticates the persisted `User` model and fails closed if the database is unavailable. This starter does not yet include self-service password reset, MFA or an invitation lifecycle.

### Optional PostgreSQL + Redis + AI service

The default `.env.example` selects the file-backed repository (`EDITION_USE_DB=false`) and deterministic AI mode (`AI_PROVIDER=demo`); external AI processing is explicitly disabled by default. To start all services with Docker Compose:

```bash
cp .env.example .env
# Set a strong SESSION_SECRET in .env before use.
docker compose up --build
```

Docker Compose starts PostgreSQL, Redis, the FastAPI assistant and the Next.js web app. The web container is configured to use the database and runs migrations and the Prisma seed command at startup. Docker Compose keeps FastAPI internal to the Compose network; run `uvicorn` independently when you need to call it directly from the host. Set a long random `AI_SERVICE_TOKEN` shared by the web and AI services.

For manual database setup, set `EDITION_USE_DB=true` and `DATABASE_URL`, then run:

```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

### Run the FastAPI service independently

```bash
cd services/ai
python -m venv .venv
# Activate the virtual environment, then:
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Health check: `GET http://localhost:8001/v1/health`.

- `AI_PROVIDER=demo` returns clearly labelled deterministic suggestions through the FastAPI service when it is configured.
- `AI_PROVIDER=openai` requires `OPENAI_API_KEY`, `AI_EXTERNAL_PROCESSING_ENABLED=true`, and a per-request editor consent checkbox before embeddings or generation sends draft text to the provider. Keep this disabled until privacy and data-processing reviews are complete.
- AI output requires human review; the assistant does not publish content.

## Useful routes and endpoints

### Reader experience

- `/edit` and `/form` — publication homepages
- `/{brand}/{articleSlug}` — long-form story
- `/{brand}/category/{categorySlug}` — category listing
- `/{brand}/tag/{tagSlug}` — tag listing
- `/{brand}/search` — publication search
- `/author/{authorSlug}` — author profile

### Studio / CMS

- `/studio` — editorial dashboard/login
- `/studio/stories/new` — new story
- `/studio/stories/{id}/edit` — edit story
- `/studio/stories/{id}/versions` — story versions
- `/studio/stories/{id}/preview` — authenticated private preview (noindex)
- `/studio/contributors`, `/studio/taxonomy`, `/studio/media`, `/studio/design-system`

### APIs

- `GET|POST /api/graphql`
- `/api/auth/login`, `/api/auth/logout`
- `/api/cms/articles` and `/api/cms/articles/{id}`
- `/api/cms/articles/{id}/publish`, `/api/cms/articles/{id}/versions`
- `/api/cms/media`
- `GET /api/cms/contributors`, `PATCH /api/cms/contributors/{slug}`
- `POST /api/cms/taxonomy` (publication-scoped section rename or shared tag rename)
- `/api/assistant` and `/api/assistant/stream`

## Editorial authoring details

- New stories require an explicit approved hero-image URL, meaningful alt text and image credit. Database-backed media records retain the original filename, MIME type, file size and uploader, in addition to the asset URL, alt text and credit. Use the Media Library to upload JPEG, PNG or WebP assets, then copy the URL into the story editor. Local uploads are served through `/api/media/:filename` so files created after the Next.js build remain accessible.
- The editor supports up to 12 gallery assets. Every gallery image requires its own approved URL, alt text and credit; galleries are persisted in PostgreSQL JSON or the local demo repository and appear in both private preview and published stories.
- Long-form copy is plain text with a small, safe editorial block format: separate paragraphs with a blank line, start a section heading with `## `, or start a pull quote with `> `. Add ` — Attribution` at the end of a quote block when an attribution is appropriate. The renderer outputs text nodes rather than arbitrary HTML.
- Saving a currently published story as draft or review asks for confirmation because that action removes the story from the public site.

## Quality commands

Run these after installing dependencies and configuring the required services:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm run storybook
npm run build-storybook
```

Python AI-service checks:

```bash
cd services/ai
pytest
python evaluate.py
```

AI evaluation boundaries and the human-review rubric are documented in [EVALUATION_PROTOCOL.md](./services/ai/EVALUATION_PROTOCOL.md). Current results and blocked checks are recorded in [QA_STATUS.md](./docs/QA_STATUS.md). The current evidence is not a production release certification. The expected review process is documented in [REVIEW_GUIDE.md](./docs/REVIEW_GUIDE.md), and new PRs use the [pull request template](./.github/PULL_REQUEST_TEMPLATE.md). CI now includes a PostgreSQL-backed browser suite, a Docker Compose integration smoke test, a Storybook build, AI contract checks, Lighthouse lab reports and Terraform validation; none of those remote GitHub Actions jobs is claimed as passed until the workflow runs. No coverage percentages, Lighthouse scores, Core Web Vitals measurements or accessibility conformance claims are presented as achieved because they have not yet been generated and reviewed.

## Important implementation notes

- If `EDITION_USE_DB` is not `true`, the content repository uses a local JSON store with seeded content. The database path is optional and should be verified against a running PostgreSQL instance.
- PostgreSQL and Redis are optional for local JSON demo mode. Production readiness fails when durable PostgreSQL or Redis is missing/unavailable; the configured FastAPI sidecar is also required in production. Production rate limiting fails closed when Redis is unavailable.
- The local JSON login path authenticates the two configured demo accounts using environment variables. Database mode uses persisted scrypt password hashes. Production still needs an account lifecycle (invitation, password reset, MFA), operational bootstrap/rotation and a security review.
- Search and taxonomy pages currently derive their vocabulary from seeded/editorial article content. Contributor profiles can be edited by editors (name, role, biography and approved portrait URL); taxonomy can rename a section within a publication or rename a shared tag across articles. Creating/deleting contributor accounts and creating/deleting empty taxonomy terms are not included.
- The AI service's default mode is deterministic demo output, not a live LLM. Embedding retrieval and provider usage require environment configuration.
- Demo article images reference remote Unsplash image URLs. Confirm image licensing/attribution and replace or clear all assets before a public launch.
- `package-lock.json` is included. Use `npm ci` for reproducible installs. Performance targets are goals only; no Lighthouse scores, Core Web Vitals measurements, or production-readiness claims are made until the corresponding checks are run and reviewed.
