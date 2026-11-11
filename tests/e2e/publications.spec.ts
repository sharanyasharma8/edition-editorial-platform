import { test, expect } from "@playwright/test";

test("THE EDIT and FORM expose distinct publication identities", async ({ page }) => {
  await page.goto("/edit");
  await expect(page.locator(".wordmark-edit")).toContainText("EDIT");
  await page.getByRole("link", { name: /FORM/ }).first().click();
  await expect(page.locator(".wordmark-form")).toContainText("FORM");
});

test("story search supports filtering", async ({ page }) => {
  await page.goto("/form/search");
  await page.getByLabel("Search editorial stories").fill("light");
  await expect(page.getByText("A new language of light")).toBeVisible();
});

test("demo editor can authenticate into the studio", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel(/EMAIL ADDRESS/i).fill("editor@edition.studio");
  await page.getByLabel(/PASSWORD/i).fill("edition-demo-pass");
  await page.getByRole("button", { name: /ENTER THE STUDIO/ }).click();
  await expect(page.getByText("All stories", { exact: false })).toBeVisible();
});

test("authors can save drafts but cannot publish them", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel(/EMAIL ADDRESS/i).fill("author@edition.studio");
  await page.getByLabel(/PASSWORD/i).fill("author-demo-pass");
  await page.getByRole("button", { name: /ENTER THE STUDIO/ }).click();
  await expect(page.getByText("All stories", { exact: false })).toBeVisible();

  const created = await page.evaluate(async () => {
    const response = await fetch("/api/cms/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "A study in considered editorial spaces",
        dek: "An original demonstration story for testing contributor permissions.",
        brand: "form",
        category: "Interiors",
        body: "This demonstration story contains enough editorial copy to satisfy the minimum body length. It is deliberately unpublished and exists only to exercise the CMS contributor workflow and verify the separation between drafting and editorial approval.",
        tags: ["Interiors", "Testing"],
        heroImage: "/uploads/e2e-fixture.webp",
        heroAlt: "A light-filled modern interior with natural materials",
        imageCredit: "EDITION demonstration image credit",
        status: "DRAFT"
      })
    });
    const payload = await response.json();
    return { status: response.status, id: payload.article?.id };
  });
  expect(created.status).toBe(201);
  expect(created.id).toBeTruthy();

  const publishStatus = await page.evaluate(async (id) => {
    const response = await fetch(`/api/cms/articles/${id}/publish`, { method: "POST" });
    return response.status;
  }, created.id);
  expect(publishStatus).toBe(403);

  const patchStatus = await page.evaluate(async (id) => {
    const response = await fetch(`/api/cms/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" })
    });
    return response.status;
  }, created.id);
  expect(patchStatus).toBe(403);
});

test("public GraphQL returns only published stories", async ({ request }) => {
  const response = await request.post("/api/graphql", {
    data: { query: "{ articles { id status } }" },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.errors).toBeUndefined();
  expect(payload.data.articles.length).toBeGreaterThan(0);
  expect(payload.data.articles.every((article: { status: string }) => article.status === "PUBLISHED")).toBeTruthy();
});


test("editors can preview an unpublished story without publishing it", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel(/EMAIL ADDRESS/i).fill("editor@edition.studio");
  await page.getByLabel(/PASSWORD/i).fill("edition-demo-pass");
  await page.getByRole("button", { name: /ENTER THE STUDIO/ }).click();
  await expect(page.getByText("All stories", { exact: false })).toBeVisible();

  const created = await page.evaluate(async () => {
    const response = await fetch("/api/cms/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "A private study in quiet materials",
        dek: "An unpublished preview used to verify the editorial review workflow.",
        brand: "form", category: "Interiors",
        body: "This unpublished demonstration story has enough copy to satisfy the editorial API. It stays in draft status while an editor reviews the typography, hero image, caption, image credit and long-form reading measure before deciding whether it is ready for publication.",
        heroImage: "/uploads/e2e-fixture.webp",
        heroAlt: "A quiet interior with a timber table beside a tall window",
        imageCredit: "EDITION demonstration image credit",
        galleryImages: [{ src: "/uploads/e2e-fixture.webp", alt: "A detail of timber joinery beside a window", credit: "EDITION demonstration gallery credit" }],
        status: "DRAFT"
      })
    });
    const payload = await response.json();
    return { status: response.status, id: payload.article?.id };
  });
  expect(created.status).toBe(201);
  expect(created.id).toBeTruthy();

  await page.goto(`/studio/stories/${created.id}/preview`);
  await expect(page.getByText(/PRIVATE PREVIEW · NOT VISIBLE TO READERS/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "A private study in quiet materials" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Story image gallery" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});


test("editors can maintain contributor profiles and shared taxonomy", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel(/EMAIL ADDRESS/i).fill("editor@edition.studio");
  await page.getByLabel(/PASSWORD/i).fill("edition-demo-pass");
  await page.getByRole("button", { name: /ENTER THE STUDIO/ }).click();
  await expect(page.getByText("All stories", { exact: false })).toBeVisible();

  await page.goto("/studio/contributors");
  const contributor = page.locator(".contributor-card").first();
  const displayName = contributor.getByLabel("DISPLAY NAME");
  const originalName = await displayName.inputValue();
  await displayName.fill(`${originalName} QA`);
  await contributor.getByRole("button", { name: /SAVE PROFILE/ }).click();
  await expect(contributor.getByText("PROFILE SAVED")).toBeVisible();
  await displayName.fill(originalName);
  await contributor.getByRole("button", { name: /SAVE PROFILE/ }).click();
  await expect(contributor.getByText("PROFILE SAVED")).toBeVisible();

  await page.goto("/studio/taxonomy");
  const sharedTags = page.locator(".taxonomy-columns section").nth(1);
  const perspective = sharedTags.locator(".taxonomy-manage-row").filter({ hasText: "Perspective" }).first();
  await perspective.getByRole("button", { name: "Rename Perspective" }).click();
  await perspective.getByRole("textbox", { name: "New name for Perspective" }).fill("Perspective QA");
  await perspective.getByRole("button", { name: "SAVE" }).click();
  await expect(page.getByText(/Updated \d+ stor(?:y|ies)\./)).toBeVisible();

  const renamed = sharedTags.locator(".taxonomy-manage-row").filter({ hasText: "Perspective QA" }).first();
  await renamed.getByRole("button", { name: "Rename Perspective QA" }).click();
  await renamed.getByRole("textbox", { name: "New name for Perspective QA" }).fill("Perspective");
  await renamed.getByRole("button", { name: "SAVE" }).click();
  await expect(page.getByText(/Updated \d+ stor(?:y|ies)\./)).toBeVisible();
});

test("media-library uploads retain filename, format, size, uploader and credit", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel(/EMAIL ADDRESS/i).fill("editor@edition.studio");
  await page.getByLabel(/PASSWORD/i).fill("edition-demo-pass");
  await page.getByRole("button", { name: /ENTER THE STUDIO/ }).click();
  await expect(page.getByText("All stories", { exact: false })).toBeVisible();

  const upload = await page.evaluate(async () => {
    const binary = atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l8sAAAAASUVORK5CYII=");
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const form = new FormData();
    form.set("file", new File([bytes], "edition-test.png", { type: "image/png" }));
    form.set("alt", "A one-pixel PNG used to verify uploaded media metadata.");
    form.set("credit", "EDITION integration test fixture");
    const response = await fetch("/api/cms/media", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) return { status: response.status, result };
    const libraryResponse = await fetch("/api/cms/media");
    const library = await libraryResponse.json();
    return {
      status: response.status,
      result,
      listed: library.media.find((item: { id: string }) => item.id === result.media.id),
      served: await fetch(result.media.url).then(async (asset) => ({ status: asset.status, type: asset.headers.get("content-type"), size: (await asset.arrayBuffer()).byteLength })),
    };
  });

  expect(upload.status).toBe(201);
  expect(upload.result.media.name).toBe("edition-test.png");
  expect(upload.result.media.mime).toBe("image/png");
  expect(upload.result.media.bytes).toBeGreaterThan(8);
  expect(upload.listed.name).toBe("edition-test.png");
  expect(upload.listed.uploadedBy).toBe("Edition Editor");
  expect(upload.listed.credit).toBe("EDITION integration test fixture");
  expect(upload.served?.status).toBe(200);
  expect(upload.served?.type).toBe("image/png");
  expect(upload.served?.size).toBeGreaterThan(8);
});

test("scheduled stories can be returned to draft and published by the protected scheduler", async ({ page }) => {
  await page.goto("/studio");
  await page.getByLabel(/EMAIL ADDRESS/i).fill("editor@edition.studio");
  await page.getByLabel(/PASSWORD/i).fill("edition-demo-pass");
  await page.getByRole("button", { name: /ENTER THE STUDIO/ }).click();
  await expect(page.getByText("All stories", { exact: false })).toBeVisible();

  const created = await page.evaluate(async () => {
    const now = Date.now();
    const response = await fetch("/api/cms/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "A scheduled study in editorial proportion",
        dek: "A controlled workflow test of publication scheduling and status transitions.",
        brand: "form",
        category: "Architecture",
        body: "This integration story exercises scheduled publishing against PostgreSQL. It is created by the editor, scheduled for a time in the near future, returned to draft, and then re-scheduled in the past for the publisher to promote. It stays in the test database only.",
        heroImage: "/uploads/scheduled-test.webp",
        heroAlt: "A geometric architectural composition used in a test story.",
        imageCredit: "EDITION integration test fixture",
        status: "SCHEDULED",
        scheduledAt: new Date(now + 60 * 60 * 1000).toISOString(),
      }),
    });
    const payload = await response.json();
    return { status: response.status, article: payload.article };
  });
  expect(created.status).toBe(201);
  expect(created.article.id).toBeTruthy();

  const reverted = await page.evaluate(async (id) => {
    const response = await fetch(`/api/cms/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DRAFT" }),
    });
    const payload = await response.json();
    return { status: response.status, scheduledAt: payload.article?.scheduledAt };
  }, created.article.id);
  expect(reverted.status).toBe(200);
  expect(reverted.scheduledAt).toBeFalsy();

  const rescheduled = await page.evaluate(async (id) => {
    const response = await fetch(`/api/cms/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SCHEDULED", scheduledAt: new Date(Date.now() - 60_000).toISOString() }),
    });
    return response.status;
  }, created.article.id);
  expect(rescheduled).toBe(200);

  const published = await page.evaluate(async () => {
    const response = await fetch("/api/internal/publish-scheduled", {
      method: "POST",
      headers: { Authorization: "Bearer edition-ci-cron-secret" },
    });
    const payload = await response.json();
    return { status: response.status, count: payload.published };
  });
  expect(published.status).toBe(200);
  expect(published.count).toBeGreaterThanOrEqual(1);

  const publicStory = await page.evaluate(async () => {
    const response = await fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: '{ articles(brand: "form", query: "scheduled study in editorial proportion") { title status } }' }),
    });
    return response.json();
  });
  expect(publicStory.data.articles).toContainEqual({ title: "A scheduled study in editorial proportion", status: "PUBLISHED" });
});
