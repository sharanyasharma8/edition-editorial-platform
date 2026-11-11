import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSession } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/request-security";

export const runtime = "nodejs";
const uploadDir = path.join(process.cwd(), "public/uploads");
const manifestPath = path.join(process.cwd(), "src/data/media-manifest.json");
const maxUploadBytes = 5 * 1024 * 1024;
type MediaItem = {
  id: string;
  url: string;
  name: string;
  alt: string;
  credit: string;
  mime: string;
  bytes: number;
  createdAt: string;
  uploadedBy: string;
};

let s3: S3Client | undefined;
function getS3() {
  if (!s3) s3 = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });
  return s3;
}

async function readManifest(): Promise<MediaItem[]> {
  try { return JSON.parse(await fs.readFile(manifestPath, "utf8")) as MediaItem[]; }
  catch { return []; }
}

function getFileSignature(mime: string, buffer: Buffer) {
  const signatures: Record<string, (value: Buffer) => boolean> = {
    "image/jpeg": (value) => value.length > 3 && value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff,
    "image/png": (value) => value.length > 8 && value.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/webp": (value) => value.length > 12 && value.toString("ascii", 0, 4) === "RIFF" && value.toString("ascii", 8, 12) === "WEBP",
  };
  return signatures[mime]?.(buffer) ?? false;
}

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (process.env.EDITION_USE_DB === "true") {
    try {
      const { prisma } = await import("@/lib/prisma");
      const rows = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
      return NextResponse.json({ media: rows.map((row) => ({
        id: row.id,
        url: row.url,
        name: row.name || row.url.split("/").pop() || "Editorial image",
        alt: row.alt,
        credit: row.credit,
        mime: row.mime || "image/*",
        bytes: row.bytes || 0,
        createdAt: row.createdAt.toISOString(),
        uploadedBy: row.uploadedBy || "Editorial desk",
      })) });
    } catch (error) {
      console.error("[edition] Media library database query failed.", error);
      return NextResponse.json({ error: "Media library is temporarily unavailable." }, { status: 503 });
    }
  }

  return NextResponse.json({ media: await readManifest() });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Cross-origin mutation is not allowed." }, { status: 403 });
  if (user.role === "AUTHOR") return NextResponse.json({ error: "Media uploads require editor permissions." }, { status: 403 });

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxUploadBytes + 128 * 1024) {
    return NextResponse.json({ error: "Multipart uploads must not exceed 5 MB per image." }, { status: 413 });
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart upload." }, { status: 400 }); }

  const file = form.get("file");
  const metadata = z.object({
    alt: z.string().trim().min(8).max(250),
    credit: z.string().trim().min(3).max(160),
  }).safeParse({ alt: form.get("alt"), credit: form.get("credit") });
  if (!(file instanceof File) || !metadata.success) {
    return NextResponse.json({ error: "Choose an image and supply meaningful alt text and image credit." }, { status: 400 });
  }

  const allowed = new Map([["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"]]);
  const extension = allowed.get(file.type);
  if (!extension) return NextResponse.json({ error: "Only JPEG, PNG and WebP are supported." }, { status: 415 });
  if (file.size <= 0 || file.size > maxUploadBytes) {
    return NextResponse.json({ error: "Images must be between 1 byte and 5 MB." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!getFileSignature(file.type, bytes)) {
    return NextResponse.json({ error: "The file contents do not match a supported image format." }, { status: 415 });
  }

  const id = crypto.randomUUID();
  const filename = `${id}${extension}`;
  const bucket = process.env.S3_MEDIA_BUCKET;
  const baseUrl = process.env.MEDIA_BASE_URL?.replace(/\/$/, "");
  let url: string;
  const itemBase = {
    id,
    name: file.name.replace(/[\r\n]/g, "").slice(0, 120),
    alt: metadata.data.alt,
    credit: metadata.data.credit,
    mime: file.type,
    bytes: file.size,
    createdAt: new Date().toISOString(),
    uploadedBy: user.name,
  };

  if (bucket) {
    if (!baseUrl) {
      return NextResponse.json({ error: "MEDIA_BASE_URL must point to the configured media CDN." }, { status: 503 });
    }
    const objectKey = `editorial/${filename}`;
    let objectUploaded = false;
    try {
      await getS3().send(new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: bytes,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
        Metadata: { alt: metadata.data.alt.slice(0, 250), credit: metadata.data.credit.slice(0, 160) },
      }));
      objectUploaded = true;
      url = `${baseUrl}/${objectKey}`;
      if (process.env.EDITION_USE_DB === "true") {
        const { prisma } = await import("@/lib/prisma");
        await prisma.mediaAsset.create({ data: { id: itemBase.id, url, alt: metadata.data.alt, credit: metadata.data.credit, name: itemBase.name, mime: itemBase.mime, bytes: itemBase.bytes, uploadedBy: user.name } });
      } else {
        const current = await readManifest();
        await fs.mkdir(path.dirname(manifestPath), { recursive: true });
        await fs.writeFile(manifestPath, JSON.stringify([{ ...itemBase, url }, ...current], null, 2), "utf8");
      }
    } catch (error) {
      if (objectUploaded) {
        await getS3().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })).catch((cleanupError) => {
          console.error("[edition] Could not roll back an orphaned S3 media object.", cleanupError);
        });
      }
      console.error("[edition] S3 media upload failed.", error);
      return NextResponse.json({ error: "Media upload failed. Check S3 permissions and database availability." }, { status: 503 });
    }
  } else {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), bytes, { flag: "wx" });
    url = `/api/media/${filename}`;
    if (process.env.EDITION_USE_DB === "true") {
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.mediaAsset.create({ data: { id: itemBase.id, url, alt: metadata.data.alt, credit: metadata.data.credit, name: itemBase.name, mime: itemBase.mime, bytes: itemBase.bytes, uploadedBy: user.name } });
      } catch (error) {
        await fs.rm(path.join(uploadDir, filename), { force: true }).catch(() => undefined);
        console.error("[edition] Local media metadata persistence failed.", error);
        return NextResponse.json({ error: "The image was not added to the media library because its metadata could not be saved." }, { status: 503 });
      }
    } else {
      const temporaryManifest = `${manifestPath}.${id}.tmp`;
      try {
        const current = await readManifest();
        await fs.mkdir(path.dirname(manifestPath), { recursive: true });
        await fs.writeFile(temporaryManifest, JSON.stringify([{ ...itemBase, url }, ...current], null, 2), { flag: "wx" });
        await fs.rename(temporaryManifest, manifestPath);
      } catch (error) {
        await Promise.all([
          fs.rm(path.join(uploadDir, filename), { force: true }).catch(() => undefined),
          fs.rm(temporaryManifest, { force: true }).catch(() => undefined),
        ]);
        console.error("[edition] Local media manifest persistence failed.", error);
        return NextResponse.json({ error: "The image was not added to the media library because its metadata could not be saved." }, { status: 503 });
      }
    }
  }

  return NextResponse.json({ media: { ...itemBase, url } satisfies MediaItem }, { status: 201 });
}
