import React from "react"

type ComponentModule = { default: React.ComponentType<Record<string, unknown>> }

export default function dynamic(
	fn: () => Promise<ComponentModule>,
): React.ComponentType<Record<string, unknown>> {
	let resolved: React.ComponentType<Record<string, unknown>> | undefined
	const promise = fn().then((mod) => {
		resolved = mod.default
	})

	return function DynamicComponent(
		props: Record<string, unknown>,
	): React.ReactElement {
		if (resolved) {
			return React.createElement(resolved, props)
		}
		throw promise
	}
}
