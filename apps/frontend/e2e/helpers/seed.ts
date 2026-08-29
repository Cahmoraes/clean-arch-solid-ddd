import { execSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import type { APIRequestContext } from "@playwright/test"
import { expect } from "@playwright/test"
import { BACKEND_URL } from "./auth"

export interface SeededGym {
	id: string
	title: string
	latitude: number
	longitude: number
	description: string | null
	phone: string | null
	cnpj: string
}

/**
 * Seed a gym directly via SQL with a fully predictable location.
 * The Gym creation endpoint requires admin auth; for E2E we insert directly so
 * specs remain deterministic and independent of the create-gym UI.
 */
function withDefaults<T>(value: T | undefined, fallback: T): T {
	return value ?? fallback
}

function defaultsForGym(overrides: Partial<SeededGym>): SeededGym {
	const id = overrides.id ?? randomUUID()
	return {
		id,
		title: withDefaults(overrides.title, `E2E Gym ${id.slice(0, 6)}`),
		latitude: withDefaults(overrides.latitude, -23.561414),
		longitude: withDefaults(overrides.longitude, -46.6558819),
		description: withDefaults(
			overrides.description,
			"Academia para testes E2E",
		),
		phone: withDefaults(overrides.phone, "+5511999990000"),
		cnpj: withDefaults(
			overrides.cnpj,
			randomUUID().replace(/-/g, "").slice(0, 14),
		),
	}
}

export function seedGym(overrides: Partial<SeededGym> = {}): SeededGym {
	const gym = defaultsForGym(overrides)
	psql(
		`INSERT INTO gyms (id, title, description, phone, latitude, longitude, cnpj, updated_at) VALUES ('${gym.id}', '${escapeSql(gym.title)}', '${escapeSql(gym.description ?? "")}', '${escapeSql(gym.phone ?? "")}', ${gym.latitude}, ${gym.longitude}, '${escapeSql(gym.cnpj)}', NOW());`,
	)
	return gym
}

/**
 * Seed a pending check-in directly via SQL. Used to set up admin-validation
 * scenarios without needing to call the protected POST /check-ins endpoint
 * (which currently is gated to admins only at the backend).
 */
export function seedCheckIn(params: {
	userId: string
	gymId: string
	latitude: number
	longitude: number
	id?: string
}): { id: string } {
	const id = params.id ?? randomUUID()
	psql(
		`INSERT INTO check_ins (id, user_id, gym_id, latitude, longitude, updated_at) VALUES ('${id}', '${params.userId}', '${params.gymId}', ${params.latitude}, ${params.longitude}, NOW());`,
	)
	return { id }
}

/**
 * Create a check-in for the given user/gym via the public REST API. The user
 * must be authenticated; the access token is required because /check-ins is
 * protected.
 */
export async function createCheckInViaApi(
	request: APIRequestContext,
	token: string,
	params: {
		userId: string
		gymId: string
		userLatitude: number
		userLongitude: number
	},
): Promise<{ id: string }> {
	const response = await request.post(`${BACKEND_URL}/check-ins`, {
		headers: { Authorization: `Bearer ${token}` },
		data: params,
	})
	expect(
		response.ok(),
		`createCheckInViaApi failed: ${response.status()} ${await response.text()}`,
	).toBeTruthy()
	return (await response.json()) as { id: string }
}

export interface SeededActivityEvent {
	id: string
	description: string
}

/**
 * Seed `count` activity events directly via SQL for the given user, most
 * recent event last (index `count` = newest, index `1` = oldest). Used to
 * deterministically exercise the drawer's 5-item summary vs. the full
 * paginated history page, since both read from the same backend table.
 */
export function seedActivityEvents(
	userId: string,
	count: number,
	options: { type?: string } = {},
): SeededActivityEvent[] {
	const type = options.type ?? "LOGIN"
	const events: SeededActivityEvent[] = []
	for (let i = 1; i <= count; i++) {
		const id = randomUUID()
		const description = `E2E Activity Event ${i}`
		const minutesAgo = count - i
		psql(
			`INSERT INTO user_activity_events (id, user_id, type, description, occurred_at) VALUES ('${id}', '${userId}', '${escapeSql(type)}', '${escapeSql(description)}', NOW() - INTERVAL '${minutesAgo} minutes');`,
		)
		events.push({ id, description })
	}
	return events
}

function psql(sql: string): string {
	const host = process.env.POSTGRES_HOST ?? "localhost"
	const port = process.env.POSTGRES_PORT ?? "5432"
	const user = process.env.POSTGRES_USER ?? "docker"
	const db = process.env.POSTGRES_DB ?? "apisolid"
	const password = process.env.POSTGRES_PASSWORD ?? "docker"
	return execSync(
		`PGPASSWORD='${password}' psql -h ${host} -p ${port} -U ${user} -d ${db} -c "${sql.replace(/"/g, '\\"')}"`,
		{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
	)
}

function escapeSql(value: string): string {
	return value.replace(/'/g, "''")
}
