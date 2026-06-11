import { useAuthStore } from "./auth-store"

const REFRESH_LEAD_MS = 60_000

export interface RefreshResult {
	accessToken: string
}

export type RefreshFn = () => Promise<RefreshResult>

export interface TokenRefreshSchedulerOptions {
	refreshFn: RefreshFn
	onForcedLogout?: () => void
}

export class TokenRefreshScheduler {
	private timer: ReturnType<typeof setTimeout> | null = null
	private inflight: Promise<void> | null = null
	private unsubscribe: (() => void) | null = null

	constructor(private readonly options: TokenRefreshSchedulerOptions) {}

	start(): void {
		if (this.unsubscribe) return
		this.scheduleFromState()
		this.unsubscribe = useAuthStore.subscribe((state, prev) => {
			if (state.expiresAt !== prev.expiresAt) {
				this.scheduleFromState()
			}
		})
	}

	stop(): void {
		this.clearTimer()
		this.unsubscribe?.()
		this.unsubscribe = null
	}

	refreshNow(): Promise<void> {
		if (this.inflight) {
			return this.inflight
		}
		const promise = (async () => {
			try {
				const result = await this.options.refreshFn()
				useAuthStore.getState().setSession(result.accessToken, "refresh")
			} catch (error) {
				useAuthStore.getState().clear("forced-logout")
				this.options.onForcedLogout?.()
				throw error
			} finally {
				this.inflight = null
			}
		})()
		this.inflight = promise
		return promise
	}

	private scheduleFromState(): void {
		this.clearTimer()
		const { expiresAt } = useAuthStore.getState()
		if (!expiresAt) return
		const delay = expiresAt - Date.now() - REFRESH_LEAD_MS
		const timeout = Math.max(0, delay)
		this.timer = setTimeout(() => {
			this.refreshNow().catch(() => {})
		}, timeout)
	}

	private clearTimer(): void {
		if (this.timer) {
			clearTimeout(this.timer)
			this.timer = null
		}
	}
}

let singleton: TokenRefreshScheduler | null = null

export function getTokenRefreshScheduler(
	options?: TokenRefreshSchedulerOptions,
): TokenRefreshScheduler {
	if (!singleton) {
		if (!options) {
			throw new Error(
				"TokenRefreshScheduler not initialized. Provide options on first call.",
			)
		}
		singleton = new TokenRefreshScheduler(options)
	}
	return singleton
}

export function resetTokenRefreshSchedulerForTests(): void {
	singleton?.stop()
	singleton = null
}

export const REFRESH_LEAD_MS_VALUE = REFRESH_LEAD_MS
