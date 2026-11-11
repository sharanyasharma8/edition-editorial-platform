import { NextResponse } from "next/server";
import { z } from "zod";
import { canPublish, getSession } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/request-security";
import { renameEditorialTerm } from "@/lib/repository";

const schema = z.object({
  kind: z.enum(["category", "tag"]),
  from: z.string().trim().min(2).max(60),
  to: z.string().trim().min(2).max(60),
  brand: z.enum(["edit", "form"]).optional(),
}).superRefine((value, context) => {
  if (value.kind === "category" && !value.brand) {
    context.addIssue({ code: "custom", path: ["brand"], message: "Choose a publication for a section rename." });
  }
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!canPublish(session.role)) return NextResponse.json({ error: "Editor permissions are required." }, { status: 403 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin mutation is not allowed." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the taxonomy fields.", details: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.from.toLocaleLowerCase() === parsed.data.to.toLocaleLowerCase()) {
    return NextResponse.json({ error: "Choose a different name." }, { status: 400 });
  }
  try {
    const changed = await renameEditorialTerm(parsed.data);
    if (!changed) return NextResponse.json({ error: "No matching stories used that term." }, { status: 404 });
    return NextResponse.json({ changed, message: `Updated ${changed} ${changed === 1 ? "story" : "stories"}.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update taxonomy." }, { status: 503 });
  }
}
