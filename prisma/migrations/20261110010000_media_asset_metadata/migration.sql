ALTER TABLE "MediaAsset"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Editorial image',
  ADD COLUMN "mime" TEXT NOT NULL DEFAULT 'image/*',
  ADD COLUMN "bytes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "uploadedBy" TEXT NOT NULL DEFAULT 'Editorial desk';
