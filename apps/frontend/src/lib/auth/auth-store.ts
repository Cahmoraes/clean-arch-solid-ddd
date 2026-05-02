import { create } from "zustand"
import { decodeJwt } from "@/lib/jwt"

export interface AuthUser {
	id: string
	role: "MEMBER" | "ADMIN"
}

export type AuthEventType = "login" | "refresh" | "logout" | "forced-logout"

export interface AuthEventDetail {
	user: AuthUser | null
}

export type SessionKind = "login" | "refresh"
export type ClearKind = "logout" | "forced-logout"

export interface AuthState {
	accessToken: string | null
	expiresAt: number | null
	user: AuthUser | null
	setSession: (token: string, kind?: SessionKind) => void
	clear: (kind?: ClearKind) => void
}

/**
 * Internal event bus for auth lifecycle events. Consumers subscribe via
 * `authEvents.addEventListener('login' | 'refresh' | 'logout' | 'forced-logout', handler)`
 * and receive a `CustomEvent<AuthEventDetail>`.
 */
export const authEvents: EventTarget = new EventTarget()

function emit(type: AuthEventType, user: AuthUser | null): void {
	authEvents.dispatchEvent(
		new CustomEvent<AuthEventDetail>(type, { detail: { user } }),
	)
}

const SESSION_FLAG_COOKIE = "has_session"

function writeSessionFlag(active: boolean): void {
	if (typeof document === "undefined") return
	if (active) {
		document.cookie = `${SESSION_FLAG_COOKIE}=1; Path=/; SameSite=Lax`
		return
	}
	document.cookie = `${SESSION_FLAG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

export const useAuthStore = create<AuthState>((set) => ({
	accessToken: null,
	expiresAt: null,
	user: null,
	setSession: (token: string, kind: SessionKind = "login") => {
		const payload = decodeJwt(token)
		if (!payload) {
			set({ accessToken: token, expiresAt: null, user: null })
			writeSessionFlag(false)
			emit(kind, null)
			return
		}
		const user: AuthUser = { id: payload.sub, role: payload.role }
		set({ accessToken: token, expiresAt: payload.exp * 1000, user })
		writeSessionFlag(true)
		emit(kind, user)
	},
	clear: (kind: ClearKind = "logout") => {
		set({ accessToken: null, expiresAt: null, user: null })
		writeSessionFlag(false)
		emit(kind, null)
	},
}))

export function getAuthSnapshot(): AuthState {
	return useAuthStore.getState()
}
