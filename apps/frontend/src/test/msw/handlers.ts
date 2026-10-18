import { HttpResponse, http } from "msw"
import type { WeatherResponse } from "@/features/weather/api/use-weather-query"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export function endpoint(path: string): string {
	return `${apiBaseUrl}${path}`
}

export function makeWeatherStub(city = "São Paulo"): WeatherResponse {
	return {
		city,
		latitude: -23.5505,
		longitude: -46.6333,
		temperature: { current: 24, apparent: 22, min: 18, max: 27 },
		condition: { code: 1, isDay: true },
		humidity: 64,
		wind: { speed: 12, directionDegrees: 45 },
		hourly: Array.from({ length: 24 }, (_, i) => {
			const day = i < 9 ? "18" : "19"
			const hour = String((15 + i) % 24).padStart(2, "0")
			return {
				time: `2026-10-${day}T${hour}:00`,
				temperature: 19 + (i % 4),
				code: 1,
				isDay: true,
			}
		}),
		daily: Array.from({ length: 7 }, (_, i) => ({
			date: `2026-10-${18 + i}`,
			min: 18,
			max: 27,
			code: 1,
		})),
	}
}

const STUB_ADMIN_PLAN = {
	id: "plan-stub",
	name: "Stub Plan",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Stub tagline.",
	features: ["Stub feature"],
	isActive: true,
	stripePriceId: "",
}

const STUB_MY_SUBSCRIPTION = {
	id: "sub-stub",
	state: "active",
	plan: { id: "plan-stub", name: "Stub Plan", priceId: "price_stub" },
	currentPeriodStart: "2026-10-15T12:00:00.000Z",
	currentPeriodEnd: "2026-11-15T12:00:00.000Z",
	cancelAtPeriodEnd: false,
}

const TRAINING_NOTES_STUB = [
	{
		data: "2026-10-16",
		texto: "Peito + tríceps 4x12",
		atualizadoEm: "2026-10-16T12:00:00.000Z",
	},
]

export const handlers = [
	http.get(endpoint("/plans"), () => HttpResponse.json([], { status: 200 })),
	http.get(endpoint("/subscriptions/me"), () =>
		HttpResponse.json(null, { status: 200 }),
	),
	http.patch(endpoint("/subscriptions/me/plan"), () =>
		HttpResponse.json(STUB_MY_SUBSCRIPTION, { status: 200 }),
	),
	http.post(endpoint("/subscriptions/me/cancel"), () =>
		HttpResponse.json(
			{
				...STUB_MY_SUBSCRIPTION,
				state: "cancel_scheduled",
				cancelAtPeriodEnd: true,
			},
			{ status: 200 },
		),
	),
	http.get(endpoint("/admin/plans"), () =>
		HttpResponse.json([], { status: 200 }),
	),
	http.post(endpoint("/admin/plans"), () =>
		HttpResponse.json(STUB_ADMIN_PLAN, { status: 201 }),
	),
	http.put(endpoint("/admin/plans/:id"), () =>
		HttpResponse.json(STUB_ADMIN_PLAN, { status: 200 }),
	),
	http.patch(endpoint("/admin/plans/:id/inactivate"), () =>
		HttpResponse.json({ ...STUB_ADMIN_PLAN, isActive: false }, { status: 200 }),
	),
	http.patch(endpoint("/admin/plans/:id/reactivate"), () =>
		HttpResponse.json({ ...STUB_ADMIN_PLAN, isActive: true }, { status: 200 }),
	),
	http.post(endpoint("/users"), () => HttpResponse.json({}, { status: 201 })),
	http.patch(endpoint("/users/activate"), () =>
		HttpResponse.json({}, { status: 204 }),
	),
	http.patch(endpoint("/users/suspend"), () =>
		HttpResponse.json({}, { status: 200 }),
	),
	http.patch(endpoint("/users/promote-admin"), () =>
		HttpResponse.json({}, { status: 200 }),
	),
	http.patch(endpoint("/users/demote-admin"), () =>
		HttpResponse.json({}, { status: 200 }),
	),
	http.patch(endpoint("/users/bulk-activate"), () =>
		HttpResponse.json(
			{ updated: 0, requested: 0, skipped: 0 },
			{ status: 200 },
		),
	),
	http.patch(endpoint("/users/bulk-deactivate"), () =>
		HttpResponse.json(
			{ updated: 0, requested: 0, skipped: 0 },
			{ status: 200 },
		),
	),
	http.post(endpoint("/sessions"), () =>
		HttpResponse.json(
			{ token: "stub-token", refreshToken: "stub-refresh" },
			{ status: 200 },
		),
	),
	http.post(endpoint("/sessions/google"), () =>
		HttpResponse.json(
			{ token: "stub-google-token", refreshToken: "stub-google-refresh" },
			{ status: 200 },
		),
	),
	http.patch(endpoint("/sessions/refresh"), () =>
		HttpResponse.json({ token: "stub-token" }, { status: 200 }),
	),
	http.post(
		endpoint("/sessions/logout"),
		() => new HttpResponse(null, { status: 204 }),
	),
	http.patch(
		endpoint("/users/me/change-password"),
		() => new HttpResponse(null, { status: 204 }),
	),
	http.post(endpoint("/users/me/password/reauth"), () =>
		HttpResponse.json(
			{ reauthGrant: "stub-grant", expiresInSeconds: 300 },
			{ status: 200 },
		),
	),
	http.post(
		endpoint("/users/me/password"),
		() => new HttpResponse(null, { status: 204 }),
	),
	http.get(endpoint("/users/me"), () =>
		HttpResponse.json(
			{
				id: "user-stub",
				name: "Stub User",
				email: "stub@example.com",
				role: "MEMBER",
				hasPassword: true,
				authMethods: ["password"],
			},
			{ status: 200 },
		),
	),
	http.get(endpoint("/users/me/metrics"), () =>
		HttpResponse.json({ checkInsCount: 0 }, { status: 200 }),
	),
	http.get(endpoint("/users/stats"), () =>
		HttpResponse.json(
			{
				total: 0,
				members: 0,
				admins: 0,
				active: 0,
				inactive: 0,
			},
			{ status: 200 },
		),
	),
	http.get(endpoint("/users/:userId"), () =>
		HttpResponse.json({ id: "user-stub", name: "Stub User" }, { status: 200 }),
	),
	http.get(endpoint("/users/me/activity"), () =>
		HttpResponse.json({ events: [] }, { status: 200 }),
	),
	http.get(endpoint("/users/:userId/activity"), () =>
		HttpResponse.json({ events: [] }, { status: 200 }),
	),
	http.get(endpoint("/users"), ({ request }) => {
		const url = new URL(request.url)
		const page = Number(url.searchParams.get("page") ?? "1")
		const limit = Number(url.searchParams.get("limit") ?? "10")
		return HttpResponse.json(
			{
				users: [],
				pagination: { page, limit, total: 0 },
			},
			{ status: 200 },
		)
	}),
	http.get(endpoint("/gyms"), ({ request }) => {
		const url = new URL(request.url)
		const page = Number(url.searchParams.get("page") ?? "1")
		return HttpResponse.json(
			{ gyms: [], pagination: { page, limit: 20, total: 0 } },
			{ status: 200 },
		)
	}),
	http.get(endpoint("/gyms/search/:name"), ({ request }) => {
		const url = new URL(request.url)
		const page = Number(url.searchParams.get("page") ?? "1")
		return HttpResponse.json(
			{ gyms: [], pagination: { page, limit: 20, total: 0 } },
			{ status: 200 },
		)
	}),
	http.get(endpoint("/gyms/:id"), ({ params }) =>
		HttpResponse.json(
			{
				id: String(params.id ?? "gym-stub"),
				title: "Stub Gym",
				description: null,
				phone: null,
				latitude: 0,
				longitude: 0,
			},
			{ status: 200 },
		),
	),
	http.post(endpoint("/gyms"), () =>
		HttpResponse.json(
			{ message: "Gym created", id: "gym-created-stub" },
			{ status: 201 },
		),
	),
	http.post(endpoint("/gyms/:id/image"), () =>
		HttpResponse.json(
			{
				imageKey: "test-image-key",
				url: "https://stub.example.com/test-image-key",
			},
			{ status: 200 },
		),
	),
	http.post(endpoint("/check-ins"), () =>
		HttpResponse.json(
			{
				message: "Check-in created",
				id: "checkin-stub",
				date: new Date().toISOString(),
			},
			{ status: 201 },
		),
	),
	http.get(endpoint("/check-ins"), ({ request }) => {
		const url = new URL(request.url)
		const page = Number(url.searchParams.get("page") ?? "1")
		return HttpResponse.json({ items: [], page, total: 0 }, { status: 200 })
	}),
	http.patch(endpoint("/check-ins/validate"), async ({ request }) => {
		const body = (await request.json().catch(() => ({}))) as {
			checkInId?: string
		}
		return HttpResponse.json(
			{ checkInId: body.checkInId ?? "checkin-stub" },
			{ status: 200 },
		)
	}),
	http.post(endpoint("/subscriptions"), () =>
		HttpResponse.json(
			{ subscriptionId: "sub_demo_stub", status: "active" },
			{ status: 201 },
		),
	),
	http.get(endpoint("/weather"), ({ request }) => {
		const url = new URL(request.url)
		const city = url.searchParams.get("city") ?? "São Paulo"
		return HttpResponse.json(makeWeatherStub(city), { status: 200 })
	}),
	http.post(endpoint("/api/v1/notifications/broadcast"), () =>
		HttpResponse.json({ recipients: 3 }, { status: 201 }),
	),
	http.get(endpoint("/training-notes"), ({ request }) => {
		const url = new URL(request.url)
		const de = url.searchParams.get("de") ?? ""
		const ate = url.searchParams.get("ate") ?? ""
		const notas = TRAINING_NOTES_STUB.filter(
			(n) => n.data >= de && n.data <= ate,
		)
		return HttpResponse.json(notas, { status: 200 })
	}),
	http.post(endpoint("/training-notes"), async ({ request }) => {
		const body = (await request.json().catch(() => ({}))) as {
			data?: string
			texto?: string
		}
		if (TRAINING_NOTES_STUB.some((n) => n.data === body.data)) {
			return HttpResponse.json(
				{
					code: "NOTA_JA_EXISTE",
					message: "Esse dia já tem nota — edite a atual",
				},
				{ status: 409 },
			)
		}
		return HttpResponse.json(
			{
				id: "nota-stub",
				data: body.data ?? "",
				texto: body.texto ?? "",
				atualizadoEm: new Date().toISOString(),
			},
			{ status: 201 },
		)
	}),
	http.put(endpoint("/training-notes/:date"), async ({ params, request }) => {
		const date = String(params.date ?? "")
		const body = (await request.json().catch(() => ({}))) as {
			texto?: string
		}
		const existente = TRAINING_NOTES_STUB.find((n) => n.data === date)
		if (!existente) {
			return HttpResponse.json(
				{ message: "Nota não encontrada — recarregue o mês" },
				{ status: 404 },
			)
		}
		return HttpResponse.json(
			{
				...existente,
				texto: body.texto ?? existente.texto,
				atualizadoEm: new Date().toISOString(),
			},
			{ status: 200 },
		)
	}),
	http.delete(endpoint("/training-notes/:date"), ({ params }) => {
		const date = String(params.date ?? "")
		if (!TRAINING_NOTES_STUB.some((n) => n.data === date)) {
			return HttpResponse.json(
				{ message: "Nota não encontrada — recarregue o mês" },
				{ status: 404 },
			)
		}
		return new HttpResponse(null, { status: 204 })
	}),
]
