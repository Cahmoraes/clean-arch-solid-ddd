"use client"

import { useRouter } from "next/navigation"
import { type ReactNode, useEffect } from "react"
import { useAuthStore } from "@/lib/auth/auth-store"

export interface AdminGuardProps {
	children: ReactNode
	/** Destino quando o usuário não tem role ADMIN. */
	redirectTo?: string
}

/**
 * AdminGuard — guarda visual/cliente de role ADMIN para sub-layouts.
 *
 * O middleware Edge do Next protege contra acesso não autenticado,
 * mas a role só é conhecida no cliente (auth-store em memória).
 * Aqui redirecionamos MEMBER para o destino indicado e só renderizamos
 * filhos quando a role é ADMIN.
 */
export function AdminGuard({ children, redirectTo = "/" }: AdminGuardProps) {
	const user = useAuthStore((state) => state.user)
	const router = useRouter()

	useEffect(() => {
		if (user && user.role !== "ADMIN") {
			router.replace(redirectTo)
		}
	}, [user, redirectTo, router])

	if (!user) {
		return <div data-testid="admin-guard-loading" aria-busy="true" />
	}

	if (user.role !== "ADMIN") {
		return null
	}

	return <>{children}</>
}
