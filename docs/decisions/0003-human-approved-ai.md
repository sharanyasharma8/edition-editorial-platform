# ADR 0003 — AI is an editorial assistant, never a publisher

- Status: Accepted
- Date: 2026-11-10

## Decision

Keep AI suggestions in a separate FastAPI service. Return structured, validated outputs, cite only approved internal story candidates, label demo output, and require a human editor to approve all suggestions. No AI endpoint can publish a story.

## Rationale

Editorial accuracy, source attribution, privacy and accountability matter more than automation. A separate service allows the model provider and retrieval method to change without coupling the CMS to one vendor.

## Trade-offs

LLM and embedding calls add latency and cost. The current in-memory embedding cache is per-process, and the retrieval corpus is a small curated seed dataset; production needs a durable, permission-aware vector/indexing layer and a formal evaluation set.
