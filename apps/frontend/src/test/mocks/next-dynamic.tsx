import React from "react"

type ComponentModule = { default: React.ComponentType<Record<string, unknown>> }

export default function dynamic(
	fn: () => Promise<ComponentModule>,
): React.ComponentType<Record<string, unknown>> {
	let resolved: React.ComponentType<Record<string, unknown>> | undefined
	let loadError: unknown
	// A rejeição é capturada aqui e relançada no render seguinte, reproduzindo o
	// comportamento real do next/dynamic: falha no carregamento do chunk vira um
	// erro de render, capturável por um ErrorBoundary ancestral.
	const promise = fn().then(
		(mod) => {
			resolved = mod.default
		},
		(error: unknown) => {
			loadError = error ?? new Error("dynamic import failed")
		},
	)

	return function DynamicComponent(
		props: Record<string, unknown>,
	): React.ReactElement {
		if (loadError) {
			throw loadError
		}
		if (resolved) {
			return React.createElement(resolved, props)
		}
		throw promise
	}
}
