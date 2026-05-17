-- Safety net against concurrent duplicate check-ins on the same day.
-- The application-level check (onSameDateOfUserId) is maintained as a fast-path,
-- but this index is the authoritative guard under concurrency.
--
-- PRE-MIGRATION CHECK: verify there are no existing duplicates before applying.
-- Run this query first and deduplicate if the result is non-empty:
--   SELECT user_id, DATE(created_at), COUNT(*)
--   FROM check_ins
--   GROUP BY user_id, DATE(created_at)
--   HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX "check_ins_user_day_unique"
  ON "check_ins" ("user_id", DATE("created_at"));