import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadDirectory = path.join(process.cwd(), "public/uploads");
const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Serve locally stored editorial uploads through a dynamic route.
 * Next.js only indexes public/ assets at build time, so runtime uploads must not
 * depend on the public-folder static-file manifest.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const isGeneratedFilename = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(filename);
  if (!isGeneratedFilename || path.basename(filename) !== filename) {
    return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
  }

  const extension = path.extname(filename).toLowerCase();
  const absolutePath = path.join(uploadDirectory, filename);
  try {
    const bytes = await fs.readFile(absolutePath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentTypes[extension],
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
    }
    console.error("[edition] Local media read failed.", error);
    return NextResponse.json({ error: "Media asset is temporarily unavailable." }, { status: 503 });
  }
}
