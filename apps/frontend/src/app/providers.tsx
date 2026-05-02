"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useEffect, useState } from "react"
import { getApi } from "@/lib/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { getTokenRefreshScheduler } from "@/lib/auth/token-refresh"
import { createQueryClient } from "@/lib/query-client"

const SESSION_FLAG_COOKIE = "has_session"

function hasSessionFlag(): boolean {
	if (typeof document === "undefined") return false
	return document.cookie
		.split(";")
		.some((entry) => entry.trim().startsWith(`${SESSION_FLAG_COOKIE}=`))
}

function AuthProvider({ children }: { children: ReactNode }) {
	const [booting, setBooting] = useState<boolean>(false)

	useEffect(() => {
		// Lazily build api singleton (also installs scheduler).
		getApi()
		const scheduler = getTokenRefreshScheduler()
		scheduler.start()

		if (hasSessionFlag() && !useAuthStore.getState().accessToken) {
			setBooting(true)
			scheduler
				.refreshNow()
				.catch(() => {})
				.finally(() => setBooting(false))
		}

		return () => {
			scheduler.stop()
		}
	}, [])

	if (booting) {
		return <div data-testid="auth-boot-skeleton" aria-busy="true" />
	}
	return <>{children}</>
}

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => createQueryClient())

	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>{children}</AuthProvider>
		</QueryClientProvider>
	)
}
