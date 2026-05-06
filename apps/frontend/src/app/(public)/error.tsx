"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/observability"

interface PublicErrorProps {
	error: Error & { digest?: string }
	reset: () => void
}

/**
 * Error boundary for the (public) route group. Renders a friendly fallback
 * instead of a blank screen when a child component throws.
 */
export default function PublicError({ error, reset }: PublicErrorProps) {
	useEffect(() => {
		logger.error("public route error", error)
	}, [error])

	return (
		<main
			role="alert"
			aria-labelledby="public-error-title"
			className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center"
		>
			<h1
				id="public-error-title"
				className="font-display text-2xl font-medium text-foreground"
			>
				Algo deu errado
			</h1>
			<p className="text-sm text-muted-foreground">
				Não foi possível carregar esta página. Tente novamente em instantes.
			</p>
			<Button
				type="button"
				onClick={() => reset()}
				data-testid="public-error-retry"
				aria-label="Tentar novamente"
			>
				Tentar novamente
			</Button>
		</main>
	)
}
