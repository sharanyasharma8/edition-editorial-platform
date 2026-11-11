# EDITION AI Editorial Assistant

FastAPI service for AI-assisted headline directions, summaries, tags, SEO descriptions, alt-text prompts, related-story retrieval, and streaming writing notes.

- `AI_PROVIDER=demo` is the default deterministic, visibly labelled output mode.
- `AI_PROVIDER=openai` selects the optional OpenAI adapter, but requests are still blocked unless `OPENAI_API_KEY`, `AI_EXTERNAL_PROCESSING_ENABLED=true`, and explicit per-request editor consent are present.
- The RAG corpus is intentionally small and includes editorial source IDs/slugs for attribution. Keyword retrieval is the reliable fallback; optional embeddings use OpenAI `text-embedding-3-small`.
- Output is Pydantic-validated. Related-source IDs are allow-listed against the corpus. No publishing endpoint exists.
- Do not send unpublished sensitive material to an external provider without an approved data-processing and privacy review.

Run with `uvicorn app.main:app --reload --port 8001` from `services/ai`. Contract tests: `pytest`. Evaluation: `python evaluate.py`.


## Internal service authentication and privacy

Set `AI_SERVICE_TOKEN` in production. The `/v1/editorial/package` and `/v1/editorial/stream` endpoints require `Authorization: Bearer <token>` when the token is configured; production refuses to run those endpoints without a token. `/v1/health` remains a minimal liveness endpoint. Docker Compose does not publish the AI port to the host.

When `AI_PROVIDER=openai`, submitted draft excerpts and the selected story brief may be sent to the configured external model provider. External processing is disabled unless `AI_EXTERNAL_PROCESSING_ENABLED=true` is set by an operator, and each request must also carry explicit editor consent. Both controls are required before embeddings or generation can call the provider. Enable this only after editorial privacy, data-processing terms, retention, and editor training have been reviewed. The default `demo` provider is deterministic and makes no external model request, even when an API key happens to be present.

## Evaluation and editorial review

See [`EVALUATION_PROTOCOL.md`](./EVALUATION_PROTOCOL.md) for the automated contract/privacy checks and a human editorial rubric covering relevance, factual fidelity, source accuracy, brand voice, alt-text grounding and fairness. The CSV file `evaluation_human_review_template.csv` is a blank review worksheet; no human-rated output quality or factuality scores are claimed for this snapshot.
