# EDITION code review guide

This checklist is intended for pull requests and portfolio code-review walkthroughs. Review changes as product behavior and production code, not just as syntax.

## 1. Editorial experience

- Does the change preserve THE EDIT and FORM as distinct publications while reusing the same architecture?
- Is hierarchy intentional: headline, deck, byline, metadata, image, caption and body?
- Are responsive crops, text measure, spacing and navigation coherent at narrow and wide widths?
- Are image alt text, visible captions, credits and rights records accurate?
- Are keyboard focus and reduced-motion behavior preserved?

## 2. React and rendering

- Can the route or component remain a Server Component?
- Is client state local to the smallest interactive component?
- Are loading, empty, error and not-found states handled?
- Are images responsive and correctly prioritised/lazy-loaded?
- Are IDs and list keys stable, and are event listeners/subscriptions cleaned up?

## 3. API and data integrity

- Is every untrusted input validated at the server boundary?
- Are access control, author ownership and publication status checked server-side?
- Are cookie-authenticated mutations protected against cross-origin requests?
- Are errors useful to the caller without leaking secrets or internal stack traces?
- Do DB and local demo repositories behave consistently where both are supported?
- Are migrations, transactions, version snapshots and cache invalidation included?

## 4. Security and AI

- Are payload sizes, query limits, upload signatures and request rates bounded?
- Are URLs allow-listed and path traversal prevented?
- Are external provider calls time-bounded and credentials kept server-side?
- Are AI outputs schema-validated, appropriately labelled, source-attributed and explicitly reviewed by a human?
- Does any AI feature avoid automatic publication or unapproved side effects?

## 5. Tests and evidence

- Test the behavior being changed, including relevant failure and permission paths.
- Run typecheck, lint, unit tests, build and affected E2E tests when dependencies/services are available.
- Record exact commands and observed results in the PR.
- For visual changes, include before/after screenshots and inspect mobile, tablet and desktop.
- For performance claims, attach reports and describe lab conditions; do not report field Core Web Vitals from Lighthouse lab data.
- Never infer coverage, accessibility conformance or deployment success from configuration files alone.

## 6. Suggested reviewer questions

1. What is the user-visible behavior that changes?
2. Which role can perform the action, and where is that permission enforced?
3. What happens if the DB, cache, AI provider, media store or network is unavailable?
4. How is this behavior tested, and what could still fail in production?
5. Is the simplest appropriate architecture used, or has unnecessary complexity been introduced?
