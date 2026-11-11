import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parents[1]))
from app.main import EditorialRequest, app, approved_related_sources, demo_package, retrieve_sources  # noqa: E402


def test_demo_output_requires_human_approval():
    request = EditorialRequest(title="The material lives on", brand="form", dek="A study of reuse and the long life of things.")
    result = demo_package(request, retrieve_sources(request))
    assert result.requires_human_approval is True
    assert len(result.headline_suggestions) >= 3
    assert result.mode == "demo"


def test_retrieval_stays_within_publication():
    request = EditorialRequest(title="Light and architecture", brand="form")
    sources = retrieve_sources(request)
    assert all(source["brand"] == "form" for source in sources)


def test_related_citations_are_internal_corpus_only():
    request = EditorialRequest(title="Slow dressing and craft", brand="edit")
    sources = retrieve_sources(request)
    result = demo_package(request, sources)
    known_ids = {source["id"] for source in sources}
    assert all(item.source_id in known_ids for item in result.related)


def test_request_validation_rejects_unknown_brand():
    with pytest.raises(ValueError):
        EditorialRequest(title="A useful title", brand="unknown")


def test_health_endpoint_is_public():
    client = TestClient(app)
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_editorial_api_requires_internal_service_token(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN", "test-internal-secret")
    client = TestClient(app)
    body = {"title": "The material lives on", "brand": "form", "dek": "A study of reuse and the long life of things."}
    denied = client.post("/v1/editorial/package", json=body)
    accepted = client.post("/v1/editorial/package", json=body, headers={"Authorization": "Bearer test-internal-secret"})
    assert denied.status_code == 401
    assert accepted.status_code == 200
    assert accepted.json()["requires_human_approval"] is True


def test_editorial_api_rejects_oversized_payload():
    client = TestClient(app)
    body = {"title": "A valid story headline", "brand": "edit", "body": "x" * 30_001}
    response = client.post("/v1/editorial/package", json=body)
    assert response.status_code == 422


def test_model_cannot_forge_internal_source_titles_or_slugs():
    request = EditorialRequest(title="Light and architecture", brand="form")
    sources = retrieve_sources(request)
    if not sources:
        pytest.skip("The seeded source corpus has no match for this test prompt.")
    trusted = sources[0]
    proposed = [{
        "source_id": trusted["id"],
        "slug": "forged-admin-route",
        "title": "A fabricated article title",
        "relevance": 9.7,
        "reason": "A model-generated explanation.",
    }, {
        "source_id": "not-in-the-corpus",
        "slug": "external-link",
        "title": "An external source",
        "relevance": 1.0,
        "reason": "Not allowed.",
    }]
    resolved = approved_related_sources(proposed, sources)
    assert len(resolved) == 1
    assert resolved[0]["source_id"] == trusted["id"]
    assert resolved[0]["slug"] == trusted["slug"]
    assert resolved[0]["title"] == trusted["title"]
    assert resolved[0]["relevance"] == 1.0


def test_openai_mode_requires_server_policy_and_per_request_consent(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    request = EditorialRequest(title="A considered story title", brand="edit", allow_external_processing=True)
    from app.main import external_processing_is_enabled
    assert external_processing_is_enabled(request) is False


def test_openai_mode_requires_editor_consent(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    request = EditorialRequest(title="A considered story title", brand="edit")
    from app.main import external_processing_is_enabled
    assert external_processing_is_enabled(request) is False


@pytest.mark.asyncio
async def test_demo_mode_never_uses_embeddings_even_when_key_exists(monkeypatch):
    import app.main as service
    monkeypatch.setenv("AI_PROVIDER", "demo")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    called = False

    async def unexpected_embedding(_text):
        nonlocal called
        called = True
        return [1.0, 0.0]

    monkeypatch.setattr(service, "embedding_for", unexpected_embedding)
    request = EditorialRequest(title="A considered story title", brand="edit", allow_external_processing=True)
    await service.retrieve_with_embeddings(request)
    assert called is False


def test_editorial_endpoint_refuses_external_processing_without_consent(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    client = TestClient(app)
    body = {"title": "A considered story title", "brand": "edit", "allow_external_processing": False}
    response = client.post("/v1/editorial/package", json=body)
    assert response.status_code == 403
    assert "consent" in response.json()["detail"].lower()


def test_stream_endpoint_refuses_external_processing_without_consent(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    client = TestClient(app)
    body = {"title": "A considered story title", "brand": "edit", "allow_external_processing": False}
    response = client.post("/v1/editorial/stream", json=body)
    assert response.status_code == 403
    assert "consent" in response.json()["detail"].lower()


def test_external_processing_requires_all_three_gates(monkeypatch):
    from app.main import external_processing_is_enabled

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    request = EditorialRequest(
        title="A considered story title", brand="edit", allow_external_processing=True
    )
    assert external_processing_is_enabled(request) is True

    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    assert external_processing_is_enabled(request) is False
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.delenv("OPENAI_API_KEY")
    assert external_processing_is_enabled(request) is False
