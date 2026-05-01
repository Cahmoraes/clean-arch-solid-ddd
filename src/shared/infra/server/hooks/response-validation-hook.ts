import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"

interface SchemaProperty {
	type?: string
	properties?: Record<string, SchemaProperty>
	required?: string[]
	items?: SchemaProperty
}

function validateAgainstSchema(
	body: unknown,
	schema: SchemaProperty,
): string[] {
	const errors: string[] = []
	if (!schema || typeof body !== "object" || body === null) return errors

	if (schema.type === "array") {
		if (!Array.isArray(body)) {
			errors.push("Expected array but got object")
		}
		return errors
	}

	if (schema.properties) {
		const requiredFields = schema.required ?? []
		for (const field of requiredFields) {
			if (!(field in body)) {
				errors.push(`Missing required field: "${field}"`)
			}
		}

		for (const [key, propSchema] of Object.entries(schema.properties)) {
			if (!(key in body)) continue
			const value = (body as Record<string, unknown>)[key]
			if (propSchema.type && value !== undefined && value !== null) {
				const actualType = Array.isArray(value) ? "array" : typeof value
				if (propSchema.type === "integer" || propSchema.type === "number") {
					if (typeof value !== "number") {
						errors.push(
							`Field "${key}" expected type "${propSchema.type}" but got "${actualType}"`,
						)
					}
				} else if (actualType !== propSchema.type) {
					errors.push(
						`Field "${key}" expected type "${propSchema.type}" but got "${actualType}"`,
					)
				}
			}
		}
	}

	return errors
}

export class ResponseValidationHook {
	static register(server: FastifyInstance): void {
		if (process.env.NODE_ENV === "production") return
		if (process.env.RESPONSE_VALIDATION_ENABLED === "false") return

		server.addHook(
			"onSend",
			async (
				request: FastifyRequest,
				reply: FastifyReply,
				payload: unknown,
			) => {
				const routeSchema = request.routeOptions?.schema?.response
				if (!routeSchema) return payload

				const statusCode = reply.statusCode
				const responseSchema = (routeSchema as Record<string, unknown>)[
					String(statusCode)
				] as SchemaProperty | undefined
				if (!responseSchema) return payload

				try {
					const body = JSON.parse(payload as string)
					const errors = validateAgainstSchema(body, responseSchema)
					if (errors.length > 0) {
						console.warn(
							`[ResponseValidation] ${request.method} ${request.url} (${statusCode}): Response does not match schema`,
							{ errors },
						)
					}
				} catch {
					// Non-JSON responses are skipped
				}

				return payload
			},
		)
	}
}
