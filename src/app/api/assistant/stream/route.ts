import { getSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/cache";
import { getClientAddress, isSameOriginRequest } from "@/lib/request-security";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().trim().min(3).max(180),
  dek: z.string().max(500).optional(),
  body: z.string().max(30_000).optional(),
  brand: z.enum(["edit", "form"]).default("edit"),
  imageDescription: z.string().max(1_000).optional(),
  allowExternalProcessing: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Authentication required.", { status: 401 });
  if (!isSameOriginRequest(request)) return new Response("Cross-origin request is not allowed.", { status: 403 });

  const limit = await consumeRateLimit(`assistant-stream:${session.id}:${getClientAddress(request)}`, 10, 60 * 60);
  if (limit.unavailable) return new Response("Editorial assistant protection is temporarily unavailable.", { status: 503 });
  if (!limit.allowed) return new Response("Editorial assistant usage limit reached.", { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid editorial request.", { status: 400 });
  const payload = parsed.data;
  const provider = (process.env.AI_PROVIDER || "demo").toLowerCase();
  const externalEnabled = process.env.AI_EXTERNAL_PROCESSING_ENABLED === "true";
  if (provider === "openai" && !externalEnabled) {
    return new Response("External AI processing is disabled by server policy. No draft text was sent to a provider.", { status: 503 });
  }
  if (provider === "openai" && !payload.allowExternalProcessing) {
    return new Response("Confirm that this draft is approved for external AI processing before continuing.", { status: 400 });
  }
  const remote = process.env.AI_SERVICE_URL;
  if (provider === "openai" && !remote) {
    return new Response("The configured AI service is unavailable. No draft text was sent to a provider.", { status: 503 });
  }
  if (remote) {
    try {
      const response = await fetch(`${remote}/v1/editorial/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.AI_SERVICE_TOKEN ? { Authorization: `Bearer ${process.env.AI_SERVICE_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          title: payload.title,
          dek: payload.dek || "",
          body: payload.body || "",
          brand: payload.brand,
          image_description: payload.imageDescription || "",
          allow_external_processing: payload.allowExternalProcessing,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (response.ok && response.body) {
        return new Response(response.body, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
        });
      }
      if (provider === "openai") {
        return new Response("The external AI provider did not return a valid stream. No demo substitution was made.", { status: 502 });
      }
    } catch (error) {
      if (provider === "openai") {
        console.warn("[edition] Configured AI stream unavailable.", error);
        return new Response("The external AI service is temporarily unavailable.", { status: 503 });
      }
      console.warn("[edition] AI stream unavailable; using deterministic local demo note.", error);
    }
  }

  const text = `Editorial note (demo mode):\n\nStart with the most specific, surprising detail in “${payload.title}”. Give the reader a reason to care in the first two sentences, then widen the frame with reporting and context. Keep claims attributable, separate observation from interpretation, and let the final paragraph return to the central idea.\n\nThis is a deterministic example, not an LLM response. Review and fact-check every suggestion before use.`;
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/);
  const stream = new ReadableStream({
    start(controller) {
      let index = 0;
      const push = () => {
        if (index >= words.length) { controller.close(); return; }
        controller.enqueue(encoder.encode(words[index++]));
        queueMicrotask(push);
      };
      push();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
