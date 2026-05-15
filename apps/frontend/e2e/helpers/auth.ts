import { execSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { type APIRequestContext, expect, type Page } from "@playwright/test"

export const BACKEND_URL =
	process.env.NEXT_PUBLIC_API_URL ??
	`http://localhost:${process.env.BACKEND_PORT ?? 3333}`

export interface TestUser {
	name: string
	email: string
	password: string
	id?: string
}

export type Role = "MEMBER" | "ADMIN"

/**
 * Generate a unique user payload. Email is randomized so specs can run in parallel
 * without colliding on the unique e-mail constraint at the backend.
 */
export function makeUser(overrides: Partial<TestUser> = {}): TestUser {
	const suffix = randomUUID().slice(0, 8)
	return {
		name: overrides.name ?? `E2E User ${suffix}`,
		email: overrides.email ?? `e2e-${suffix}@example.com`,
		password: overrides.password ?? "Senha123!",
	}
}

/**
 * Create a user via the public POST /users endpoint.
 * Returns the created user enriched with the id resolved from the database.
 */
export async function signupUser(
	request: APIRequestContext,
	user: TestUser,
	role: Role = "MEMBER",
): Promise<TestUser> {
	const response = await request.post(`${BACKEND_URL}/users`, {
		data: { name: user.name, email: user.email, password: user.password, role },
	})
	expect(
		response.ok(),
		`signupUser failed: ${response.status()} ${await response.text()}`,
	).toBeTruthy()
	const id = await fetchUserIdFromDb(user.email)
	return { ...user, id }
}

/**
 * Activate the given user directly via SQL.
 * Note: in this backend the default user status on signup is already
 * `activated`, so this helper is mostly idempotent. Kept to keep the
 * onboarding spec semantically aligned with the PRD flow.
 */
export async function activateUserInDb(email: string): Promise<void> {
	psql(
		`UPDATE users SET status = 'activated' WHERE email = '${escapeSql(email)}';`,
	)
}

/**
 * Promote the given user to ADMIN role directly via SQL.
 */
export async function promoteToAdminInDb(email: string): Promise<void> {
	psql(`UPDATE users SET role = 'ADMIN' WHERE email = '${escapeSql(email)}';`)
}

/**
 * Provision an active user (and optionally admin) ready for login.
 */
export async function provisionUser(
	request: APIRequestContext,
	options: { role?: Role; user?: Partial<TestUser> } = {},
): Promise<TestUser> {
	const role = options.role ?? "MEMBER"
	const user = await signupUser(request, makeUser(options.user), role)
	await activateUserInDb(user.email)
	if (role === "ADMIN") await promoteToAdminInDb(user.email)
	return user
}

/**
 * Perform UI login and wait for the redirect to the post-login route.
 */
export async function loginViaUi(
	page: Page,
	user: TestUser,
	expectedRedirect = "/academias",
): Promise<void> {
	await page.goto("/login")
	await page.getByLabel("E-mail").fill(user.email)
	await page.getByLabel("Senha").fill(user.password)
	await page.getByTestId("login-submit").click()
	await page.waitForURL(`**${expectedRedirect}**`, { timeout: 30_000 })
}

/**
 * Quickly seed a session by calling POST /sessions and storing the refresh
 * cookie + access token. Useful for tests that don't exercise the login UI.
 */
export async function loginViaApi(
	request: APIRequestContext,
	page: Page,
	user: TestUser,
): Promise<{ token: string }> {
	const response = await request.post(`${BACKEND_URL}/sessions`, {
		data: { email: user.email, password: user.password },
	})
	expect(
		response.ok(),
		`loginViaApi failed: ${response.status()} ${await response.text()}`,
	).toBeTruthy()
	const body = (await response.json()) as { token: string }
	const cookies = response
		.headersArray()
		.filter((h) => h.name.toLowerCase() === "set-cookie")
	for (const cookie of cookies) {
		const [pair] = cookie.value.split(";")
		const eqIndex = pair.indexOf("=")
		const name = pair.slice(0, eqIndex)
		const value = pair.slice(eqIndex + 1)
		await page.context().addCookies([
			{
				name,
				value,
				domain: "localhost",
				path: "/",
				httpOnly: true,
			},
		])
	}
	return { token: body.token }
}

function fetchUserIdFromDb(email: string): string | undefined {
	const out = psql(
		`SELECT id FROM users WHERE email = '${escapeSql(email)}' LIMIT 1;`,
		"-tA",
	)
	const id = out.trim()
	return id.length > 0 ? id : undefined
}

function psqlEnv(): {
	host: string
	port: string
	user: string
	db: string
	password: string
} {
	return {
		host: process.env.POSTGRES_HOST ?? "localhost",
		port: process.env.POSTGRES_PORT ?? "5432",
		user: process.env.POSTGRES_USER ?? "docker",
		db: process.env.POSTGRES_DB ?? "apisolid",
		password: process.env.POSTGRES_PASSWORD ?? "docker",
	}
}

function psql(sql: string, extraFlag?: string): string {
	const { host, port, user, db, password } = psqlEnv()
	const flag = extraFlag ?? ""
	return execSync(
		`PGPASSWORD='${password}' psql ${flag} -h ${host} -p ${port} -U ${user} -d ${db} -c "${sql.replace(/"/g, '\\"')}"`,
		{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
	)
}

function escapeSql(value: string): string {
	return value.replace(/'/g, "''")
}

export async function seedGoogleToken(
	request: APIRequestContext,
	input: { idToken: string; sub: string; email: string; name: string },
): Promise<{ idToken: string }> {
	const response = await request.post(
		`${BACKEND_URL}/sessions/google/dev-token`,
		{ data: { ...input, emailVerified: true } },
	)
	expect(
		response.ok(),
		`seedGoogleToken failed: ${response.status()} ${await response.text()}`,
	).toBeTruthy()
	return { idToken: input.idToken }
}

export async function loginViaSeededGoogleApi(
	request: APIRequestContext,
	page: Page,
	idToken: string,
): Promise<{ accessToken: string }> {
	const response = await request.post(`${BACKEND_URL}/sessions/google`, {
		data: { idToken },
	})
	expect(
		response.ok(),
		`loginViaSeededGoogleApi failed: ${response.status()} ${await response.text()}`,
	).toBeTruthy()
	const body = (await response.json()) as { token: string }
	const cookies = response
		.headersArray()
		.filter((h) => h.name.toLowerCase() === "set-cookie")
	for (const cookie of cookies) {
		const [pair] = cookie.value.split(";")
		const eqIndex = pair.indexOf("=")
		const name = pair.slice(0, eqIndex)
		const value = pair.slice(eqIndex + 1)
		await page
			.context()
			.addCookies([
				{ name, value, domain: "localhost", path: "/", httpOnly: true },
			])
	}
	return { accessToken: body.token }
}

export async function requestFirstPasswordGrant(
	request: APIRequestContext,
	accessToken: string,
	idToken: string,
): Promise<{ reauthGrant: string }> {
	const response = await request.post(
		`${BACKEND_URL}/users/me/password/reauth`,
		{
			headers: { Authorization: `Bearer ${accessToken}` },
			data: { provider: "google", idToken },
		},
	)
	expect(
		response.ok(),
		`requestFirstPasswordGrant failed: ${response.status()} ${await response.text()}`,
	).toBeTruthy()
	return (await response.json()) as { reauthGrant: string }
}

export async function defineFirstPasswordViaApi(
	request: APIRequestContext,
	accessToken: string,
	reauthGrant: string,
	newPassword: string,
): Promise<void> {
	const response = await request.post(`${BACKEND_URL}/users/me/password`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		data: { provider: "google", reauthGrant, newRawPassword: newPassword },
	})
	expect(
		response.status(),
		`defineFirstPasswordViaApi failed: ${await response.text()}`,
	).toBe(204)
}

export async function loginViaEmailUi(
	page: Page,
	user: { email: string; password: string },
	expectedRedirect = "/academias",
): Promise<void> {
	await page.goto("/login")
	await page.getByLabel("E-mail").fill(user.email)
	await page.getByLabel("Senha").fill(user.password)
	await page.getByTestId("login-submit").click()
	await page.waitForURL(`**${expectedRedirect}**`, { timeout: 30_000 })
}
