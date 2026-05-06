"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/observability"

interface AuthenticatedErrorProps {
	error: Error & { digest?: string }
	reset: () => void
}

/**
 * Error boundary for the (authenticated) route group. Renders a friendly
 * fallback instead of a blank screen when a child component throws.
 */
export default function AuthenticatedError({
	error,
	reset,
}: AuthenticatedErrorProps) {
	useEffect(() => {
		logger.error("authenticated route error", error)
	}, [error])

	return (
		<main
			role="alert"
			aria-labelledby="auth-error-title"
			className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center"
		>
			<h1
				id="auth-error-title"
				className="font-display text-2xl font-medium text-foreground"
			>
				Não foi possível carregar esta página
			</h1>
			<p className="text-sm text-muted-foreground">
				Algo inesperado aconteceu. Tente novamente — se o problema persistir,
				atualize a página.
			</p>
			<Button
				type="button"
				onClick={() => reset()}
				data-testid="authenticated-error-retry"
				aria-label="Tentar novamente"
			>
				Tentar novamente
			</Button>
		</main>
	)
}
