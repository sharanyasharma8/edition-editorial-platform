# EDITION QA status

**Snapshot date:** 11 November 2026
**Purpose:** evidence log for this source snapshot; this is not a production release certification.

## Verified in this workspace

| Check | Result | Evidence and limits |
|---|---|---|
| npm dependency install | **PASS** | `package-lock.json` is present and dependencies are installed. Use `npm ci` for a clean reproducible install. |
| Prisma validation/client generation | **PASS** | `prisma validate` and `prisma generate` passed with a local `DATABASE_URL`. |
| Full TypeScript typecheck | **PASS** | `tsc --noEmit` passed after Prisma client generation. |
| ESLint | **PASS** | `eslint .` completed with no reported errors. |
| Vitest / React Testing Library | **PASS — 16/16** | 7 unit test files passed. |
| Next.js production build | **PASS** | `next build` compiled, checked types, generated 19 static pages and completed build traces. |
| Playwright E2E | **PASS — 9/9** | Production app tested against isolated PostgreSQL and Redis. Includes publication identities/search, studio auth/roles, preview, GraphQL, taxonomy rename, media upload/list/serve, and scheduled publishing. |
| Storybook production build | **PASS WITH WARNINGS** | Storybook output generated. Warnings include a large bundle, sourcemap/directive notices, and a missing optional MDX glob. |
| FastAPI service tests | **PASS — 14/14** | `cd services/ai && pytest -q`; includes service contracts and external-processing privacy/consent tests. |
| Deterministic AI contract evaluation | **PASS — 15/15** | `cd services/ai && python evaluate.py`; three scenarios × five contract checks. This is not a factuality, writing-quality or editorial approval score. |
| Python compilation | **PASS** | `python -m compileall -q app tests evaluate.py` from `services/ai`. |
| FastAPI process integration | **PASS** | A local Uvicorn process returned 200 for health, 401 for an unauthenticated protected request, and labelled demo output for authenticated package and stream requests. This did not exercise an external LLM provider. |
| TypeScript/TSX syntax parsing | **PASS — 84 files, 0 syntax diagnostics** | Global TypeScript `transpileModule` syntax pass across `src`, `tests`, `services`, `prisma` and `.storybook`. This checks syntax, not types or module resolution. |
| Dependency-free TypeScript helper assertions | **PASS — 42 assertions** | Compiled and executed editorial block parsing, image URL allow-list/path safety, GraphQL pagination/search bounds and publication configuration helpers, including generated media URL strictness and traversal/host-spoof rejection. This is not the Vitest suite. |
| YAML / JSON configuration parsing | **PASS** | PyYAML parsed both GitHub Actions workflows and `docker-compose.yml`; Python JSON parsing validated `package.json`, `tsconfig.json`, `.lighthouserc.json` and `.prettierrc.json`. This is not GitHub Actions, Docker or Lighthouse execution. |
| Whitespace / patch validation | **PASS** | `git diff --check` passed before the final documentation edits. |

## Not run, blocked or not independently verified

| Check | Status | Reason / next action |
|---|---|---|
| Docker image / Docker Compose smoke test | **NOT RUN** | Docker is available, but the complete Compose stack smoke test has not been run. |
| Redis failure/recovery behavior | **NOT RUN** | E2E passed with a healthy isolated Redis instance; outage and recovery behavior remains untested. |
| Terraform format / init / validate / plan | **NOT RUN** | No Terraform CLI validation or plan was run. |
| Lighthouse lab audit | **NOT RUN** | Requires successful production build and browser. Four audit URLs target the two publication homepages and one seeded article per brand. No score, LCP, CLS or INP measurement is claimed. |
| WCAG 2.2 AA audit | **NOT RUN** | Automated and manual keyboard, screen-reader, contrast, focus, zoom and reduced-motion review remain. |
| Responsive visual review | **NOT RUN** | Desktop, tablet, and mobile screenshots/layouts have not been formally reviewed. |
| AWS deployment / live demo | **NOT RUN** | Requires a real AWS account, configured GitHub OIDC role/environment, state bucket, VPC/subnets, domain/site URL, certificate and cost approval. No cloud resources or public URL exist. |

## CI configured (not yet executed here)

`.github/workflows/ci.yml` defines jobs for:

- Node install, Prisma client generation, typecheck, ESLint, Vitest and Next production build.
- FastAPI tests and deterministic AI contract evaluation.
- Playwright E2E using a PostgreSQL service, migrations and seed data.
- Docker Compose integration smoke: service readiness, demo editor login and published-only GraphQL behavior.
- Storybook production build.
- Lighthouse lab reports for both brands and seeded articles.
- Terraform initialization and validation.

The workflow definitions parse as YAML locally, but no GitHub-hosted job has run in this workspace. Treat the first CI run as a verification milestone; fix rather than skip any failing job.

## Reproduction commands

```bash
# From repository root
npm ci
npx prisma generate
npx prisma validate
npm run typecheck
npm run lint
npm test
npm run build
npm run build-storybook
npx playwright install --with-deps chromium
npm run test:e2e
npm run lighthouse

# Docker-capable environment (use an override if local ports 3000/5432/6379 are occupied)
cp .env.example .env
# Set fresh random SESSION_SECRET and AI_SERVICE_TOKEN values before starting.
docker compose config --quiet
docker compose up --build --wait

# Python AI service
cd services/ai
pytest -q
python evaluate.py
```

Before public use, replace demo editorial copy/images and verify image licences/credits; configure production authentication lifecycle, rotate secrets, review the AI privacy policy, and complete a security/accessibility/performance review. The LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 values are targets, not measured outcomes.
