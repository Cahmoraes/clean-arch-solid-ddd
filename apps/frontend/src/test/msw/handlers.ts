import { HttpResponse, http } from "msw"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function endpoint(path: string): string {
	return `${apiBaseUrl}${path}`
}

export const handlers = [
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
	http.get(endpoint("/gyms"), () => HttpResponse.json([], { status: 200 })),
	http.get(endpoint("/gyms/search/:name"), () =>
		HttpResponse.json([], { status: 200 }),
	),
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
]
