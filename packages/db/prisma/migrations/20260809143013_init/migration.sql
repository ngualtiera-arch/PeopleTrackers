-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'staff');

-- CreateEnum
CREATE TYPE "fee_rule" AS ENUM ('zero', 'non_locate_rate', 'locate_rate');

-- CreateEnum
CREATE TYPE "agent_skill_code" AS ENUM ('skip_tracing', 'process_serving', 'debt_collection');

-- CreateEnum
CREATE TYPE "email_status" AS ENUM ('queued', 'sent', 'bounced', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "totp_secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locate_rate" DECIMAL(12,2) NOT NULL,
    "non_locate_rate" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locate_rate" DECIMAL(12,2),
    "non_locate_rate" DECIMAL(12,2),
    "uses_package" BOOLEAN NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "case_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "fee_rule" "fee_rule" NOT NULL,

    CONSTRAINT "case_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "reference" SERIAL NOT NULL,
    "company" TEXT,
    "contact_name" TEXT,
    "kind" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "email_invoice" TEXT,
    "email_reports" TEXT,
    "addr1" TEXT,
    "addr2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Australia',
    "postal_addr1" TEXT,
    "postal_addr2" TEXT,
    "postal_city" TEXT,
    "postal_state" TEXT,
    "postal_postcode" TEXT,
    "postal_country" TEXT,
    "attention" TEXT,
    "terms" TEXT,
    "abn" TEXT,
    "notes" TEXT,
    "package_id" TEXT,
    "file_fee" DECIMAL(12,2),
    "locate_fee" DECIMAL(12,2),
    "non_locate_fee" DECIMAL(12,2),
    "hourly_fee" DECIMAL(12,2),
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "reference" SERIAL NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "addr1" TEXT,
    "addr2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "rate" DECIMAL(12,2),
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_skills" (
    "agent_id" TEXT NOT NULL,
    "skill" "agent_skill_code" NOT NULL,

    CONSTRAINT "agent_skills_pkey" PRIMARY KEY ("agent_id","skill")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "reference" SERIAL NOT NULL,
    "client_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "case_type_id" TEXT NOT NULL,
    "status_id" TEXT NOT NULL,
    "package_id" TEXT,
    "client_ref" TEXT,
    "rate_locate" DECIMAL(12,2),
    "rate_non_locate" DECIMAL(12,2),
    "fee" DECIMAL(12,2),
    "units" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "amount" DECIMAL(12,2),
    "date_entered" DATE NOT NULL,
    "date_due" DATE,
    "date_closed" DATE,
    "date_instruction_sent" DATE,
    "report_sent" BOOLEAN NOT NULL DEFAULT false,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "subject_title" TEXT,
    "subject_firstname" TEXT,
    "subject_middlename" TEXT,
    "subject_lastname" TEXT,
    "subject_gender" TEXT,
    "subject_dob" DATE,
    "subject_licence" TEXT,
    "subject_ph_home" TEXT,
    "subject_ph_mobile" TEXT,
    "subject_ph_work" TEXT,
    "subject_ph_other" TEXT,
    "confirmed_addr1" TEXT,
    "confirmed_addr2" TEXT,
    "confirmed_city" TEXT,
    "confirmed_state" TEXT,
    "confirmed_postcode" TEXT,
    "confirmed_country" TEXT,
    "last_known_addr1" TEXT,
    "last_known_addr2" TEXT,
    "last_known_city" TEXT,
    "last_known_state" TEXT,
    "last_known_postcode" TEXT,
    "last_known_country" TEXT,
    "employer" TEXT,
    "employer_addr1" TEXT,
    "employer_addr2" TEXT,
    "employer_city" TEXT,
    "employer_state" TEXT,
    "employer_postcode" TEXT,
    "employer_country" TEXT,
    "employer_phone" TEXT,
    "employer_fax" TEXT,
    "additional_info" TEXT,
    "agent_notes" TEXT,
    "report" TEXT,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_log" (
    "id" TEXT NOT NULL,
    "case_id" TEXT,
    "document_id" TEXT,
    "to_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "status" "email_status" NOT NULL DEFAULT 'queued',
    "sent_at" TIMESTAMP(3),
    "sent_by" TEXT,
    "error" TEXT,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "packages_code_key" ON "packages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "case_types_code_key" ON "case_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "case_statuses_code_key" ON "case_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "clients_reference_key" ON "clients"("reference");

-- CreateIndex
CREATE INDEX "clients_reference_idx" ON "clients"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "agents_reference_key" ON "agents"("reference");

-- CreateIndex
CREATE INDEX "agents_reference_idx" ON "agents"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "cases_reference_key" ON "cases"("reference");

-- CreateIndex
CREATE INDEX "cases_reference_idx" ON "cases"("reference");

-- CreateIndex
CREATE INDEX "cases_client_id_idx" ON "cases"("client_id");

-- CreateIndex
CREATE INDEX "cases_agent_id_idx" ON "cases"("agent_id");

-- CreateIndex
CREATE INDEX "cases_status_id_idx" ON "cases"("status_id");

-- CreateIndex
CREATE INDEX "cases_date_entered_idx" ON "cases"("date_entered");

-- CreateIndex
CREATE INDEX "cases_date_due_idx" ON "cases"("date_due");

-- CreateIndex
CREATE INDEX "cases_report_sent_idx" ON "cases"("report_sent");

-- CreateIndex
CREATE INDEX "cases_invoiced_idx" ON "cases"("invoiced");

-- CreateIndex
CREATE INDEX "cases_client_ref_idx" ON "cases"("client_ref");

-- CreateIndex
CREATE UNIQUE INDEX "report_templates_code_key" ON "report_templates"("code");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_case_type_id_fkey" FOREIGN KEY ("case_type_id") REFERENCES "case_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "case_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "generated_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
