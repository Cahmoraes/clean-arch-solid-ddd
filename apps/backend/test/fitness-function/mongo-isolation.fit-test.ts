import { execFile } from "node:child_process"
import { rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { afterEach, describe, expect, it } from "vitest"

// Known failures that exist before this feature and are out of scope here: two failing tests and one
// skipped test in the current fitness suite, and one failing test in test/contract/subscription.contract-test.ts
// (HTTP/OpenAPI contract, unrelated to the repository contracts). This file neither fixes nor hides them.

const execFileAsync = promisify(execFile)
const BACKEND_ROOT = path.resolve(import.meta.dirname, "..", "..")
const RULE_NAME = "no-domain-or-application-to-mongodb-driver"

interface DepcruiseViolation {
	rule: { name: string }
	from: string
	to: string
}

function parseViolations(stdout: string): DepcruiseViolation[] {
	const output: { summary: { violations: DepcruiseViolation[] } } =
		JSON.parse(stdout)
	return output.summary.violations
}

function hasStdout(error: unknown): error is Error & { stdout: string } {
	return (
		error instanceof Error &&
		"stdout" in error &&
		typeof error.stdout === "string" &&
		error.stdout.length > 0
	)
}

async function mongoViolations(
	targets: string[],
): Promise<DepcruiseViolation[]> {
	const args = [
		"depcruise",
		"--validate",
		".dependency-cruiser.js",
		"--output-type",
		"json",
		...targets,
	]
	try {
		const { stdout } = await execFileAsync("npx", args, {
			cwd: BACKEND_ROOT,
			maxBuffer: 256 * 1024 * 1024,
		})
		return parseViolations(stdout).filter((v) => v.rule.name === RULE_NAME)
	} catch (error) {
		// depcruise exits non-zero when it finds error-level violations; the report is still on stdout.
		if (hasStdout(error)) {
			return parseViolations(error.stdout).filter(
				(v) => v.rule.name === RULE_NAME,
			)
		}
		throw error
	}
}

describe("mongodb driver isolation", () => {
	const fixtures: string[] = []

	async function writeFixture(
		relativePath: string,
		source: string,
	): Promise<string> {
		await writeFile(path.join(BACKEND_ROOT, relativePath), source)
		fixtures.push(relativePath)
		return relativePath
	}

	afterEach(async () => {
		await Promise.all(
			fixtures
				.splice(0)
				.map((relativePath) =>
					rm(path.join(BACKEND_ROOT, relativePath), { force: true }),
				),
		)
	})

	it("AC-11: no domain or application file in src imports the mongodb driver", async () => {
		expect(await mongoViolations(["src"])).toEqual([])
	}, 180_000)

	it("AC-11: a domain file importing mongodb is reported", async () => {
		const fixture = await writeFixture(
			"src/gym/domain/mongo-isolation-fixture.ts",
			'import { MongoClient } from "mongodb"\nexport const driver = MongoClient\n',
		)

		const violations = await mongoViolations([fixture])

		expect(violations.map((violation) => violation.from)).toEqual([fixture])
	}, 60_000)

	it("AC-11: an application file importing only mongodb types is reported", async () => {
		const fixture = await writeFixture(
			"src/gym/application/mongo-isolation-fixture.ts",
			'import type { ClientSession } from "mongodb"\nexport type Session = ClientSession\n',
		)

		const violations = await mongoViolations([fixture])

		expect(violations.map((violation) => violation.from)).toEqual([fixture])
	}, 60_000)

	it("FR-021: an infra file may import mongodb", async () => {
		const fixture = await writeFixture(
			"src/gym/infra/mongo-isolation-fixture.ts",
			'import { MongoClient } from "mongodb"\nexport const driver = MongoClient\n',
		)

		expect(await mongoViolations([fixture])).toEqual([])
	}, 60_000)
})
