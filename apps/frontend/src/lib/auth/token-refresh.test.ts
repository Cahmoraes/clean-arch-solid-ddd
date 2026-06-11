import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAuthStore } from "./auth-store"
import { REFRESH_LEAD_MS_VALUE, TokenRefreshScheduler } from "./token-refresh"

function makeJwt(payload: Record<string, unknown>): string {
	const part = (obj: unknown) =>
		Buffer.from(JSON.stringify(obj))
			.toString("base64")
			.replace(/=+$/, "")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
	return `${part({ alg: "HS256" })}.${part(payload)}.sig`
}

describe("TokenRefreshScheduler", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("dedupes concurrent refreshNow calls into a single refresh", async () => {
		let calls = 0
		const refreshFn = vi.fn(async () => {
			calls += 1
			await new Promise((resolve) => setTimeout(resolve, 50))
			const exp = Math.floor((Date.now() + 5 * 60_000) / 1000)
			return { accessToken: makeJwt({ sub: "u", role: "MEMBER", exp }) }
		})
		const scheduler = new TokenRefreshScheduler({ refreshFn })

		const p1 = scheduler.refreshNow()
		const p2 = scheduler.refreshNow()
		const p3 = scheduler.refreshNow()

		await vi.advanceTimersByTimeAsync(60)
		await Promise.all([p1, p2, p3])

		expect(calls).toBe(1)
		expect(refreshFn).toHaveBeenCalledTimes(1)
		expect(useAuthStore.getState().accessToken).toBeTruthy()

		scheduler.stop()
	})

	it("schedules a refresh 60s before expiration when start() is called", async () => {
		const exp = Math.floor((Date.now() + 5 * 60_000) / 1000)
		useAuthStore
			.getState()
			.setSession(makeJwt({ sub: "u", role: "MEMBER", exp }))

		const refreshFn = vi.fn(async () => ({
			accessToken: makeJwt({
				sub: "u",
				role: "MEMBER",
				exp: Math.floor((Date.now() + 10 * 60_000) / 1000),
			}),
		}))

		const scheduler = new TokenRefreshScheduler({ refreshFn })
		scheduler.start()

		const expiresAt = useAuthStore.getState().expiresAt as number
		const expectedDelay = expiresAt - Date.now() - REFRESH_LEAD_MS_VALUE

		// Just before scheduled time: no refresh yet
		await vi.advanceTimersByTimeAsync(expectedDelay - 100)
		expect(refreshFn).not.toHaveBeenCalled()

		// After scheduled time: refresh fires
		await vi.advanceTimersByTimeAsync(200)
		expect(refreshFn).toHaveBeenCalledTimes(1)

		scheduler.stop()
	})

	it("clears auth store and rethrows when refresh fails", async () => {
		useAuthStore.setState({
			accessToken: "old",
			expiresAt: Date.now() + 1000,
			user: { id: "u", role: "MEMBER" },
		})
		const onForcedLogout = vi.fn()
		const scheduler = new TokenRefreshScheduler({
			refreshFn: async () => {
				throw new Error("boom")
			},
			onForcedLogout,
		})

		await expect(scheduler.refreshNow()).rejects.toMatchObject({
			message: "boom",
		})
		expect(useAuthStore.getState().accessToken).toBeNull()
		expect(onForcedLogout).toHaveBeenCalledTimes(1)
	})
})
