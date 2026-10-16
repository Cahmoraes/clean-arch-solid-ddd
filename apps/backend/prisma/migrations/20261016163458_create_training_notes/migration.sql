-- CreateTable
CREATE TABLE "training_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "texto" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "training_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_notes_user_id_data_idx" ON "training_notes"("user_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "training_notes_user_id_data_key" ON "training_notes"("user_id", "data");

-- AddForeignKey
ALTER TABLE "training_notes" ADD CONSTRAINT "training_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
