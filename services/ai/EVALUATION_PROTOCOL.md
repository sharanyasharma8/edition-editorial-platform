# EDITION AI Editorial Assistant — evaluation protocol

This protocol separates automated contract/privacy checks from editorial quality review. A passing contract evaluator does **not** establish factual correctness, fairness, or publication readiness.

## 1. Automated checks

Run from `services/ai/`:

```bash
pytest -q
python evaluate.py
```

The automated suite covers:

- Pydantic request/output validation and bounded request fields.
- Brand-scoped retrieval (THE EDIT content does not enter FORM recommendations and vice versa).
- Source-ID resolution: model-proposed related items are accepted only when their IDs exist in the approved retrieved corpus; title and slug are restored from trusted corpus metadata.
- Required fields, minimum suggestion counts and the `requires_human_approval` contract.
- Internal service bearer-token enforcement.
- External provider privacy gates: provider mode, operator opt-in, API key and per-request editor consent must all be present.
- Demo mode makes no embedding request even when a provider key is present.
- Provider package and stream endpoints reject missing consent before external processing.

`python evaluate.py` currently reports 15/15 deterministic output-contract checks across three sample briefs. This is a small regression check of the deterministic demo adapter, not an evaluation score for a live model.

## 2. Editorial quality review (human)

For every model/provider change, create a review set that includes both publications, short and long briefs, ambiguous material, missing image descriptions, and cases with no relevant internal source. At least two editors should independently review a representative sample before a model/prompt change is enabled in production.

Rate each output from 1 (unusable) to 5 (excellent):

| Dimension | Reviewer question |
|---|---|
| Brief relevance | Does the output reflect the actual assignment rather than generic magazine language? |
| Factual fidelity | Are all names, dates, places, materials and claims supported by the supplied draft or cited approved source? |
| Source accuracy | Do related-story suggestions resolve to the correct internal article, and is the stated connection defensible? |
| Brand voice | Does it suit THE EDIT or FORM without flattening the two publications into one voice? |
| Editorial usefulness | Does the suggestion create a useful direction without pretending to be finished reporting? |
| Alt-text grounding | Does the wording describe only visible details supplied by an editor, without inference about identity or intent? |
| Fairness and sensitivity | Does the output avoid stereotypes, protected-trait inference, harmful framing and unsupported assumptions? |

Record the provider/model, prompt version, test case ID, reviewer, scores, factual issues, rejected outputs and remediation. Treat any invented fact, fabricated citation, unsupported image inference or privacy violation as a release-blocking issue regardless of average score. The reviewer must verify every factual claim against source material; model confidence and numeric relevance are not evidence.

Use `evaluation_human_review_template.csv` for a consistent review record. Do not populate it with simulated ratings and present them as completed evaluation.

## 3. Privacy and security review

Before enabling provider-backed requests:

1. Keep `AI_EXTERNAL_PROCESSING_ENABLED=false` until legal/privacy review has approved the provider, data-processing terms, retention and editor training.
2. Verify `AI_PROVIDER=openai`, a server-side API key, operator opt-in and request-level editor consent are all necessary gates.
3. Confirm the default demo adapter makes no external request, even if a key is accidentally present.
4. Inspect application and AI-service logs to ensure raw unpublished draft content, personal data and credentials are not logged.
5. Test denied requests at both the Next.js proxy and FastAPI service. Confirm denial occurs before embeddings/generation.
6. Review the smallest necessary text excerpt and image description sent to the provider; never send secrets, personal data or confidential notes without explicit approval.
7. Keep the AI sidecar private and require the internal bearer token in production.

## 4. Known limitations

- The seeded corpus is small and uses lexical retrieval as a fallback. It is a demonstration corpus, not a production content index.
- Optional embeddings and OpenAI generation require explicit provider configuration and consent. No live-provider evaluation is claimed for this source snapshot.
- Automated checks validate output shape, brand boundaries, source references and privacy gates; they cannot prove factuality, originality, fairness or editorial quality.
- Related-source relevance is a retrieval score, not a truth score.
- Every suggestion remains subject to editor review; the service has no publish capability.
