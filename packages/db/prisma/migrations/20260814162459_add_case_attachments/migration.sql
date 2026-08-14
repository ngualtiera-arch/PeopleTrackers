-- CreateTable
CREATE TABLE "case_attachments" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT,

    CONSTRAINT "case_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_attachments_case_id_idx" ON "case_attachments"("case_id");

-- AddForeignKey
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
