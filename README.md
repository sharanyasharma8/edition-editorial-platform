# EDITION — Multi-brand editorial publishing platformEDITION is a work-in-progress portfolio prototype of a shared digital publishing platform for two fictional editorial brands:
- THE EDIT (/edit) — fashion, beauty, culture and lifestyle.
- FORM (/form) — architecture, interiors, art and design.
The project explores how multiple publications can share one application, editorial workspace, content model and design system while retaining distinct brand identities. It combines reader-facing editorial experiences with a role-aware CMS and an optional AI editorial-assistant service.
Project status — 11 November 2026: The current snapshot has a functioning local prototype and has passed the locally recorded checks listed below. It is not a production deployment or a claim of production readiness. Several operational, performance, accessibility and infrastructure tasks remain on the roadmap. See [the QA status log](./docs/QA_STATUS.md) for the verification record and limitations.

At a glance
Area	Current implementation
Reader experience	Two brand-configured publication sites, article pages, categories, tags, search and author pages
Editorial workspace	Dashboard, story creation/editing, private previews, versions, contributors, taxonomy and media library
Application	Next.js App Router, React, TypeScript and Server Components
APIs	GraphQL Yoga for reader-facing queries; REST route handlers for studio operations
Persistence	Prisma schema and migrations for PostgreSQL, plus a local JSON demo repository
Supporting services	Optional Redis integration and a separate FastAPI editorial-assistant service
Component development	Storybook
Quality tooling	Vitest, React Testing Library, Playwright, ESLint and Lighthouse CI configuration
Local orchestration	Dockerfiles and Docker Compose
CI	GitHub Actions for application, AI-service, browser, container and Storybook checks


Technology stack
- Frontend: Next.js 15 App Router, React 19, TypeScript, CSS and Server Components.
- API layer: GraphQL Yoga at /api/graphql; Next.js REST route handlers for authentication, CMS, media and AI proxy operations.
- Data: PostgreSQL, Prisma ORM, SQL migrations and seed data; local JSON storage for the lightweight demo mode.
- Caching and rate limiting: Optional Redis integration.
- AI service: Python, FastAPI and Pydantic, with deterministic demo responses and optional OpenAI integration/embeddings.
- Testing and UI development: Vitest, React Testing Library, Playwright and Storybook.
- Build and orchestration: Docker, Docker Compose and GitHub Actions.
Local setup
Requirements
- Node.js 22 LTS is the recommended version for local development and matches the CI configuration.
- npm, included with Node.js.
- Git, if cloning the repository.
PostgreSQL and Redis are not required for the default file-backed demo. Docker is required only if you want to run the complete multi-service setup described below.
Start the web application
From the repository root, create your local environment file:

macOS / Linux
cp .env.example .env.local
Windows PowerShell
Copy-Item .env.example .env.local
Install dependencies and start the development server:
npm ci
npm run dev
On Windows PowerShell, use npm.cmd if PowerShell blocks the npm.ps1 script:
npm.cmd ci
npm.cmd run dev
Open http://localhost:3000. The root route redirects to /edit.

The default .env.example selects the local JSON repository (EDITION_USE_DB=false) and deterministic AI mode (AI_PROVIDER=demo). Replace the placeholder SESSION_SECRET with a long random value before using the application beyond a local demonstration. Do not commit .env.local or other secret-bearing environment files.
Demo CMS accounts
The local demo login uses environment-configurable accounts. The defaults in .env.example are:
Role	Email	Password
Editor	editor@edition.studio	edition-demo-pass
Author	author@edition.studio	author-demo-pass


These are demonstration credentials only. Change them before exposing any environment outside your own machine. In database mode, prisma/seed.ts creates the accounts with scrypt password hashes using the configured environment values. A production deployment would also need a reviewed credential bootstrap and rotation process.
Run PostgreSQL, Redis, the AI service and the web app with Docker Compose
The Compose configuration starts PostgreSQL, Redis, the FastAPI assistant and the Next.js web application. The web container uses PostgreSQL and Redis and runs Prisma migrations and the seed command at startup. The AI service is internal to the Compose network and is not published as a host port.

Create the Compose environment file:

macOS / Linux
cp .env.example .env
Windows PowerShell
Copy-Item .env.example .env
Set strong, unique values for SESSION_SECRET and AI_SERVICE_TOKEN in .env, then run:
docker compose up --build --wait
Open http://localhost:3000. To stop the services:
docker compose down
To remove the local database, cache and upload volumes as well, use docker compose down --volumes. This permanently deletes the data stored in those local Compose volumes.
Use PostgreSQL without Docker Compose
For a manually managed PostgreSQL instance, configure EDITION_USE_DB=true and set DATABASE_URL in .env.local. Ensure the database is running, then execute:
npx prisma generate
npx prisma migrate deploy
npm run db:seed
Redis can be configured separately through REDIS_URL. It is optional for the local demo; production rate limiting requires a healthy Redis deployment and is designed to fail closed when Redis is unavailable.
Run the FastAPI service independently
The web application can use its deterministic demo behaviour without a separately started AI service. To run the FastAPI service as a separate process:
cd services/ai
python -m venv .venv
Activate the virtual environment, then install and run the service:
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
Health endpoint: http://localhost:8001/v1/health.

The service uses AI_PROVIDER=demo by default and returns deterministic, clearly labelled suggestions. The optional OpenAI provider requires OPENAI_API_KEY, AI_EXTERNAL_PROCESSING_ENABLED=true and explicit per-request editor consent before draft text is sent to the external provider. Keep external processing disabled until privacy, data-processing and retention requirements have been reviewed. AI suggestions require human review; the assistant does not publish stories.
Product areas and routes
Reader experience
- /edit and /form — brand homepages.
- /{brand}/{articleSlug} — long-form article.
- /{brand}/category/{categorySlug} — category listing.
- /{brand}/tag/{tagSlug} — tag listing.
- /{brand}/search — publication search.
- /author/{authorSlug} — author profile.
Publication identity is configuration-driven in src/lib/brands.ts; the two brands share the application rather than running as separate projects.
Studio / CMS
- /studio — studio entry and editorial dashboard/login.
- /studio/stories/new — create a story.
- /studio/stories/{id}/edit — edit a story.
- /studio/stories/{id}/versions — view story versions.
- /studio/stories/{id}/preview — authenticated, private story preview (noindex).
- /studio/contributors — contributor profile management.
- /studio/taxonomy — publication sections and shared tags.
- /studio/media — media library.
- /studio/design-system — shared design-system reference.
API surface
- GET / POST /api/graphql — reader-facing GraphQL endpoint; article queries expose published content.
- /api/auth/login and /api/auth/logout — studio authentication.
- /api/cms/articles and /api/cms/articles/{id} — story operations.
- /api/cms/articles/{id}/publish — publishing operation.
- /api/cms/articles/{id}/versions — story version history.
- /api/cms/media — media upload and listing.
- GET /api/cms/contributors and PATCH /api/cms/contributors/{slug} — contributor operations.
- POST /api/cms/taxonomy — publication-scoped section rename or shared-tag rename.
- /api/assistant and /api/assistant/stream — web-to-AI-service operations.
- /api/health and /api/health/live — readiness and liveness checks.
Editorial workflow and content handling
- New stories require an approved hero-image URL, meaningful alt text and image credit.
- The media library supports JPEG, PNG and WebP uploads. Database-backed media records retain metadata such as original filename, MIME type, file size and uploader, alongside the asset URL, alt text and credit.
- The editor supports up to 12 gallery assets. Each image requires its own URL, alt text and credit; galleries are stored with the story and appear in private previews and published articles.
- Long-form copy uses a small text-based block format: separate paragraphs with a blank line, prefix a section heading with ## , or prefix a pull quote with > . Add  — Attribution at the end of a quote block when appropriate. The renderer outputs text nodes rather than arbitrary HTML.
- Saving a published story as draft or review requires confirmation because the change removes it from the public publication experience.
- When an editor changes taxonomy or contributor information, the relevant CMS route enforces the operation server-side; permissions are not based only on whether a control is visible in the UI.
Quality checks
Install dependencies first. From the repository root, run:
npm run typecheck
npm run lint
npm test
npm run build
npm run build-storybook
For browser tests, install the Playwright browser and ensure the test environment's PostgreSQL/Redis services and environment variables are configured:
npx playwright install chromium
npm run test:e2e
To start Storybook interactively:
npm run storybook
For the Python service, from services/ai with its virtual environment activated:
pytest -q
python evaluate.py
The project also includes a Lighthouse CI configuration and GitHub Actions workflows. Their presence is not evidence that a check has passed; results must be reviewed from the corresponding run and artifacts.
Verification snapshot
The following results are recorded in [`docs/QA_STATUS.md`](./docs/QA_STATUS.md) for the 11 November 2026 workspace snapshot:
- TypeScript typecheck and ESLint passed.
- Unit tests passed: 16/16.
- Playwright E2E tests passed: 9/9 in the recorded isolated PostgreSQL/Redis test environment.
- Next.js production build passed.
- FastAPI tests passed: 14/14.
- Deterministic AI contract evaluation passed: 15/15. This verifies response/contract conditions, not editorial quality or factual accuracy.
- Storybook production build completed with warnings.
The following have not been verified as complete: Docker Compose smoke test, Lighthouse measurements, WCAG/accessibility audit, responsive visual review, production infrastructure validation and an AWS deployment. No Lighthouse score, Core Web Vitals result, WCAG conformance level or live production URL is claimed.

See [`docs/QA_STATUS.md`](./docs/QA_STATUS.md) for evidence, reproduction notes and limitations. See [`docs/REVIEW_GUIDE.md`](./docs/REVIEW_GUIDE.md) for the expected review process and [the pull request template](./.github/PULL_REQUEST_TEMPLATE.md) for proposed changes.
Development roadmap
EDITION is an evolving prototype. The next milestones are intended to move it closer to a production-oriented editorial platform. These are planned improvements, not features or validations claimed as complete.
Engineering and infrastructure
- CI reliability: Re-run the updated GitHub Actions workflow and resolve any remaining build, test or environment-specific failures.
- Infrastructure as Code: Add and review a real Terraform configuration before reintroducing Terraform formatting, initialization and validation to CI.
- Cloud deployment: Design and validate a deployment using managed PostgreSQL, Redis, object storage, secrets management, HTTPS and appropriate network boundaries. No AWS resources or live deployment are included in this snapshot.
- Resilience and observability: Expand structured logging, service-level monitoring, alerting, failure-recovery tests and operational runbooks.
- Authentication lifecycle: Add a reviewed invitation/onboarding flow, password reset, MFA, credential rotation and administrative account lifecycle.
Performance, accessibility and responsive quality
- Performance measurement: Run repeatable Lighthouse audits and establish baselines for LCP, INP and CLS before setting optimization targets.
- Accessibility: Conduct automated and manual accessibility reviews, including keyboard-only use, focus management, contrast, screen-reader behaviour, zoom and reduced-motion preferences. Target WCAG 2.2 AA as a goal; no conformance claim is made yet.
- Responsive validation: Review and test key reader and studio journeys across mobile, tablet and desktop viewports.
- Visual regression: Add repeatable visual checks for publication pages and shared components where they provide useful coverage.
AI quality and editorial trust
- AI evaluation: Expand evaluation beyond response contracts to include relevance, factual fidelity, source attribution, brand voice, alt-text grounding and fairness, with documented human review.
- Retrieval quality: Evaluate retrieval against a larger, approved editorial corpus and measure whether returned sources are genuinely relevant.
- Privacy controls: Complete a data-processing and privacy review before enabling external model processing for unpublished editorial material.
Content and release readiness
- Content rights: Review and replace demo content and remote image assets as needed; verify image licences, permissions, credits and attribution before public use.
- Release process: Document repeatable staging/production releases, database migration handling, backup/restore procedures and rollback steps.
Known limitations and important notes
- With EDITION_USE_DB unset or set to false, the application uses a local JSON content store. This is suitable for a local demonstration, not durable multi-instance production persistence.
- PostgreSQL is the intended durable data store. Redis is optional for local development, but production rate limiting requires Redis; production configuration should be tested with the real service topology.
- The local demo login uses environment-configurable credentials. Database mode uses persisted scrypt password hashes. Self-service password reset, MFA, invitation lifecycle and full operational credential-management processes are not implemented.
- Search and taxonomy vocabulary are derived from available editorial content. Editors can update contributor profiles and rename existing sections/tags; contributor account creation/deletion and creation/deletion of empty taxonomy terms are outside the current implementation.
- The default AI mode is deterministic demo output, not a live LLM. OpenAI generation and embedding calls are optional and gated by server configuration and per-request editor consent.
- The AI retrieval corpus is intentionally small. Automated contract checks do not establish editorial quality, factual accuracy or suitability for publication.
- The repository includes an S3 media adapter, but it does not include a deployable Terraform stack or provisioned AWS infrastructure. Cloud deployment remains planned.
- Demo articles reference remote Unsplash images. Verify licences, usage permissions and credits, and replace demo assets before a public launch.
- The project is a portfolio prototype. Complete security, privacy, accessibility, performance, operational and content-rights reviews before any production use.
Documentation
- [Architecture](./docs/ARCHITECTURE.md)
- [QA status and verification evidence](./docs/QA_STATUS.md)
- [AWS deployment roadmap](./docs/AWS_DEPLOYMENT.md)
- [Security notes](./docs/SECURITY.md)
- [Performance notes](./docs/PERFORMANCE.md)
- [Content rights](./docs/CONTENT_RIGHTS.md)
- [AI service documentation](./services/ai/README.md)
- [AI evaluation protocol](./services/ai/EVALUATION_PROTOCOL.md)
