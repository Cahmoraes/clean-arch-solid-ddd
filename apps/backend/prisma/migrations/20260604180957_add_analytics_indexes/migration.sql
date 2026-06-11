-- CreateIndex
CREATE INDEX "check_ins_created_at_idx" ON "check_ins"("created_at");

-- CreateIndex
CREATE INDEX "check_ins_user_id_created_at_idx" ON "check_ins"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
