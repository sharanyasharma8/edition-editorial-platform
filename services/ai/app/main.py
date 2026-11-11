"""EDITION's editorial-assistance service.

Demo mode is deterministic and clearly labelled. OpenAI mode uses RAG snippets from the
approved editorial corpus, validates a strict response schema, and returns source IDs for
human verification. This service never has a publishing capability.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import math
import os
import re
from pathlib import Path
from typing import Any, AsyncIterator

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ValidationError

APP_DIR = Path(__file__).parent
CORPUS_PATH = APP_DIR / "corpus.json"
if not CORPUS_PATH.exists():
    CORPUS_PATH = Path("/app/content/articles.json")
try:
    CORPUS: list[dict[str, Any]] = json.loads(CORPUS_PATH.read_text())
except Exception:
    CORPUS = []

_EMBEDDING_CACHE: dict[str, list[float]] = {}


async def verify_service_token(authorization: str | None = Header(default=None)) -> None:
    """Keep the internal AI HTTP API private from direct public callers."""
    expected = os.getenv("AI_SERVICE_TOKEN")
    if not expected:
        if os.getenv("NODE_ENV", "development").lower() == "production":
            raise HTTPException(status_code=503, detail="AI service authentication is not configured.")
        return
    supplied = authorization.removeprefix("Bearer ") if authorization else ""
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Invalid service credentials.")

app = FastAPI(title="EDITION Editorial Assistant", version="1.0.0", docs_url="/docs")


class EditorialRequest(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    dek: str = Field(default="", max_length=500)
    body: str = Field(default="", max_length=30_000)
    brand: str = Field(pattern="^(edit|form)$")
    image_description: str = Field(default="", max_length=1_000)
    allow_external_processing: bool = False


class SourceAttribution(BaseModel):
    source_id: str
    slug: str
    title: str
    relevance: float = Field(ge=0, le=1)
    reason: str


class EditorialPackage(BaseModel):
    mode: str
    label: str
    headline_suggestions: list[str] = Field(min_length=3, max_length=5)
    summary: str = Field(min_length=10, max_length=600)
    tags: list[str] = Field(min_length=3, max_length=10)
    seo_description: str = Field(min_length=40, max_length=170)
    alt_text: str = Field(min_length=10, max_length=300)
    related: list[SourceAttribution] = Field(default_factory=list, max_length=5)
    requires_human_approval: bool = True
    validation_notes: list[str] = Field(default_factory=list)


def tokens(text: str) -> set[str]:
    return {word for word in re.findall(r"[a-zA-Z][a-zA-Z-]{2,}", text.lower()) if word not in {"the", "and", "for", "with", "that", "this", "from", "into", "your", "about"}}


def retrieve_sources(request: EditorialRequest, limit: int = 3) -> list[dict[str, Any]]:
    """Simple, inspectable keyword retriever; replace with vector storage at scale."""
    query = tokens(f"{request.title} {request.dek} {request.body[:6000]}")
    candidates = []
    for source in CORPUS:
        if source.get("brand") != request.brand:
            continue
        words = tokens(" ".join([source.get("title", ""), source.get("excerpt", "")]))
        union = query | words
        score = len(query & words) / max(1, len(union))
        if score > 0:
            candidates.append((score, source))
    candidates.sort(key=lambda item: item[0], reverse=True)
    return [{**source, "relevance": round(score, 3)} for score, source in candidates[:limit]]


async def embedding_for(text: str) -> list[float] | None:
    """Optional OpenAI embedding adapter with process-local content-hash caching."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    cache_key = hashlib.sha256(f"{model}:{text[:6000]}".encode("utf-8")).hexdigest()
    if cache_key in _EMBEDDING_CACHE:
        return _EMBEDDING_CACHE[cache_key]
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": model, "input": text[:6000]},
        )
        response.raise_for_status()
        vector = response.json()["data"][0]["embedding"]
    if len(_EMBEDDING_CACHE) >= 512:
        _EMBEDDING_CACHE.pop(next(iter(_EMBEDDING_CACHE)))
    _EMBEDDING_CACHE[cache_key] = vector
    return vector


def approved_related_sources(
    proposed: list[dict[str, Any]], sources: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Resolve model proposals to trusted corpus metadata by stable source ID.

    The LLM may rank or explain an internal source, but it cannot invent its title or URL slug.
    """
    approved = {str(source["id"]): source for source in sources}
    related: list[dict[str, Any]] = []
    for item in proposed:
        if not isinstance(item, dict):
            continue
        source = approved.get(str(item.get("source_id", "")))
        if not source:
            continue
        try:
            relevance = max(0.0, min(1.0, float(item.get("relevance", source.get("relevance", 0.0)))))
        except (TypeError, ValueError):
            relevance = float(source.get("relevance", 0.0))
        reason = item.get("reason")
        if not isinstance(reason, str) or not reason.strip():
            reason = "Suggested from the approved internal editorial corpus; verify before use."
        related.append({
            "source_id": str(source["id"]),
            "slug": str(source["slug"]),
            "title": str(source["title"]),
            "relevance": relevance,
            "reason": reason[:240],
        })
    return related[:5]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_l = math.sqrt(sum(a * a for a in left))
    norm_r = math.sqrt(sum(b * b for b in right))
    return dot / (norm_l * norm_r) if norm_l and norm_r else 0.0


def external_processing_is_enabled(request: EditorialRequest) -> bool:
    """Require server policy and per-request editor consent before external processing."""
    return (
        os.getenv("AI_PROVIDER", "demo").lower() == "openai"
        and os.getenv("AI_EXTERNAL_PROCESSING_ENABLED", "false").lower() == "true"
        and request.allow_external_processing
        and bool(os.getenv("OPENAI_API_KEY"))
    )


async def retrieve_with_embeddings(request: EditorialRequest) -> list[dict[str, Any]]:
    """Use embeddings only after explicit server policy and per-request editor consent."""
    if not external_processing_is_enabled(request):
        return retrieve_sources(request)
    try:
        query_vector = await embedding_for(f"{request.title}\n{request.dek}\n{request.body[:6000]}")
        if not query_vector:
            return retrieve_sources(request)
        candidates = [source for source in CORPUS if source.get("brand") == request.brand]
        vectors = await asyncio.gather(*[
            embedding_for(f"{source['title']}\n{source['excerpt']}") for source in candidates
        ])
        ranked = [
            (cosine_similarity(query_vector, vector), source)
            for source, vector in zip(candidates, vectors)
            if vector
        ]
        ranked.sort(key=lambda item: item[0], reverse=True)
        return [{**source, "relevance": round(max(0.0, min(1.0, score)), 3)} for score, source in ranked[:3]]
    except Exception:
        # No claim of vector retrieval when provider/network failures occur.
        return retrieve_sources(request)


def demo_package(request: EditorialRequest, sources: list[dict[str, Any]]) -> EditorialPackage:
    headline = request.title.strip().rstrip(".")
    summary = request.dek.strip() or f"An editorial introduction exploring the context, people and ideas behind {headline.lower()}."
    tags = ["Perspective", "Culture", "Ideas"] if request.brand == "edit" else ["Design", "Materials", "Ideas"]
    related = [SourceAttribution(source_id=s["id"], slug=s["slug"], title=s["title"], relevance=min(1, s["relevance"]), reason="Keyword overlap with the submitted story brief.") for s in sources]
    return EditorialPackage(
        mode="demo",
        label="DEMO SUGGESTIONS · DETERMINISTIC OUTPUT, NOT AN LLM RESPONSE",
        headline_suggestions=[f"{headline}: a closer look", f"Inside the ideas shaping {headline.lower()}", f"Why {headline.lower()} matters now"],
        summary=summary[:600], tags=tags,
        seo_description=(f"Explore {headline.lower()} in this considered EDITION story. Reporting, perspective and ideas."[:158]),
        alt_text=(request.image_description.strip() or "Describe the visible subject, setting, composition and meaningful details after reviewing the selected image.")[:300],
        related=related, requires_human_approval=True,
        validation_notes=["Demo mode is deterministic.", "No source attribution is a factual endorsement; verify each cited internal story.", "Human review is required before editorial use."],
    )


async def openai_package(request: EditorialRequest, sources: list[dict[str, Any]]) -> EditorialPackage:
    if not external_processing_is_enabled(request):
        raise HTTPException(status_code=403, detail="External AI processing requires server approval and explicit editor consent.")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:  # Defensive; external_processing_is_enabled already checks this.
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured.")
    source_context = [{"id": s["id"], "slug": s["slug"], "title": s["title"], "excerpt": s["excerpt"]} for s in sources]
    system = (
        "You are a cautious editorial assistant for a premium magazine. Return valid JSON only. "
        "Do not invent facts, quotes, names, dates or source claims. Use only the supplied story brief. "
        "Provide suggestions, not final copy. Related items must reference only supplied source IDs. "
        "Alt text must describe visible details only; when no image description is supplied, ask for a human visual review. "
        "Never publish or imply approval. Avoid protected-trait inferences."
    )
    user = {
        "brand": request.brand, "title": request.title, "dek": request.dek, "body_excerpt": request.body[:6000],
        "image_description": request.image_description, "approved_internal_sources": source_context,
        "required_json_keys": ["headline_suggestions", "summary", "tags", "seo_description", "alt_text", "related"],
        "related_shape": [{"source_id": "one supplied id", "slug": "supplied slug", "title": "supplied title", "relevance": 0.0, "reason": "brief reason"}],
    }
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"), "temperature": 0.3,
                  "response_format": {"type": "json_object"},
                  "messages": [{"role": "system", "content": system}, {"role": "user", "content": json.dumps(user)}]},
        )
        response.raise_for_status()
    try:
        raw = json.loads(response.json()["choices"][0]["message"]["content"])
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="The model returned an unreadable editorial package.") from exc
    if not isinstance(raw, dict):
        raise HTTPException(status_code=502, detail="The model returned an invalid editorial package shape.")
    proposed_related = raw.get("related", [])
    raw["related"] = approved_related_sources(
        proposed_related if isinstance(proposed_related, list) else [], sources
    )
    raw["mode"] = "openai"
    raw["label"] = "AI-ASSISTED SUGGESTIONS · HUMAN REVIEW REQUIRED"
    raw["requires_human_approval"] = True
    raw["validation_notes"] = ["Related-source IDs were checked against the approved internal corpus.", "This output is not independently fact-checked.", "Human approval is required before use."]
    try:
        parsed = EditorialPackage.model_validate(raw)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail={"message": "The model output did not pass editorial schema validation.", "validation": exc.errors()}) from exc
    return parsed


@app.get("/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "provider": os.getenv("AI_PROVIDER", "demo"), "service": "edition-editorial-assistant"}


@app.post("/v1/editorial/package", response_model=EditorialPackage, dependencies=[Depends(verify_service_token)])
async def editorial_package(request: EditorialRequest) -> EditorialPackage:
    if os.getenv("AI_PROVIDER", "demo").lower() == "openai" and not external_processing_is_enabled(request):
        raise HTTPException(status_code=403, detail="External AI processing is disabled or editor consent was not provided.")
    sources = await retrieve_with_embeddings(request)
    if os.getenv("AI_PROVIDER", "demo").lower() == "openai":
        try:
            return await openai_package(request, sources)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="LLM provider request failed. Retry or use demo mode.") from exc
    return demo_package(request, sources)


@app.post("/v1/editorial/stream", dependencies=[Depends(verify_service_token)])
async def editorial_stream(request: EditorialRequest) -> StreamingResponse:
    if os.getenv("AI_PROVIDER", "demo").lower() == "openai" and not external_processing_is_enabled(request):
        raise HTTPException(status_code=403, detail="External AI processing is disabled or editor consent was not provided.")

    async def generate() -> AsyncIterator[str]:
        if os.getenv("AI_PROVIDER", "demo").lower() == "openai":
            try:
                async with httpx.AsyncClient(timeout=25) as client:
                    async with client.stream("POST", "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
                        json={"model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"), "stream": True,
                              "messages": [{"role": "system", "content": "Offer a brief writing note. Do not invent facts or sources. Label uncertainty. This is a suggestion, not an approval."},
                                           {"role": "user", "content": f"Brand: {request.brand}\nTitle: {request.title}\nDeck: {request.dek}\nDraft excerpt: {request.body[:3000]}"}]}) as response:
                        if response.status_code >= 400:
                            yield "Provider unavailable. Please retry in demo mode."
                            return
                        async for line in response.aiter_lines():
                            if line.startswith("data: ") and line != "data: [DONE]":
                                try:
                                    chunk = json.loads(line[6:])["choices"][0]["delta"].get("content", "")
                                    if chunk:
                                        yield chunk
                                except (ValueError, KeyError, IndexError):
                                    continue
                return
            except httpx.HTTPError:
                yield "Provider unavailable. Please retry in demo mode."
                return
        note = (f"Editorial note (demo mode): Start with the most specific, surprising detail in “{request.title}”. "
                "Give the reader a reason to care in the first two sentences, then widen the frame with reporting and context. "
                "Keep claims attributable, separate observation from interpretation, and let the final paragraph return to the central idea. "
                "This is a deterministic example, not an LLM response. Review and fact-check every suggestion before use.")
        for piece in re.findall(r"\S+\s*", note):
            yield piece
    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8", headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})
