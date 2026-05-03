"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useEffect, useLayoutEffect, useState } from "react"
import { getApi } from "@/lib/api"
import { useAuthStore } from "@/lib/auth/auth-store"
import { getTokenRefreshScheduler } from "@/lib/auth/token-refresh"
import { createQueryClient } from "@/lib/query-client"

const SESSION_FLAG_COOKIE = "has_session"

function hasSessionFlag(): boolean {
	if (typeof document === "undefined") return false
	return document.cookie
		.split(";")
		.some((entry) => entry.trim() === `${SESSION_FLAG_COOKIE}=1`)
}

function AuthProvider({ children }: { children: ReactNode }) {
	const [booting, setBooting] = useState<boolean>(false)

	// Seta booting=true antes do browser pintar para evitar flash de conteúdo
	// sem auth e evitar que filhos disparem chamadas de API com accessToken nulo.
	useLayoutEffect(() => {
		if (hasSessionFlag() && !useAuthStore.getState().accessToken) {
			setBooting(true)
		}
	}, [])

	useEffect(() => {
		// Inicializa singleton do API client (também registra o scheduler).
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
