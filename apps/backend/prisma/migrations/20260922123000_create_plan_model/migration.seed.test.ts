import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

const migrationPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"migration.sql",
)

describe("migration 20260922123000_create_plan_model", () => {
	test("cria a tabela plans", () => {
		const sql = readFileSync(migrationPath, "utf-8")
		expect(sql).toMatch(/CREATE TABLE "plans"/)
	})

	test("popula os priceId demo atuais em stripe_price_id", () => {
		const sql = readFileSync(migrationPath, "utf-8")
		expect(sql).toContain("price_demo_monthly")
		expect(sql).toContain("price_demo_yearly")
	})

	test("o seed de planos é idempotente (ON CONFLICT ... DO NOTHING), não um INSERT puro que duplicaria em reexecuções", () => {
		const sql = readFileSync(migrationPath, "utf-8")
		expect(sql).toMatch(/INSERT INTO "plans"/)
		expect(sql).toMatch(/ON CONFLICT \("id"\) DO NOTHING/)
	})
})
