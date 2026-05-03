import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"

interface SchemaProperty {
	type?: string
	properties?: Record<string, SchemaProperty>
	required?: string[]
	items?: SchemaProperty
}

const NUMERIC_TYPES = new Set(["integer", "number"])

function getActualType(value: unknown): string {
	return Array.isArray(value) ? "array" : typeof value
}

function isTypeMismatch(value: unknown, expectedType: string): boolean {
	if (NUMERIC_TYPES.has(expectedType)) {
		return typeof value !== "number"
	}
	return getActualType(value) !== expectedType
}

function formatTypeError(
	key: string,
	expectedType: string,
	value: unknown,
): string {
	return `Field "${key}" expected type "${expectedType}" but got "${getActualType(value)}"`
}

function validateArraySchema(body: unknown): string[] {
	return Array.isArray(body) ? [] : ["Expected array but got object"]
}

function collectMissingRequiredFields(
	body: object,
	required: string[],
): string[] {
	return required
		.filter((field) => !(field in body))
		.map((field) => `Missing required field: "${field}"`)
}

function validateProperty(
	key: string,
	value: unknown,
	propSchema: SchemaProperty,
): string | null {
	if (!propSchema.type || value === undefined || value === null) return null
	if (!isTypeMismatch(value, propSchema.type)) return null
	return formatTypeError(key, propSchema.type, value)
}

function validateProperties(
	body: object,
	properties: Record<string, SchemaProperty>,
): string[] {
	const errors: string[] = []
	for (const [key, propSchema] of Object.entries(properties)) {
		if (!(key in body)) continue
		const value = (body as Record<string, unknown>)[key]
		const error = validateProperty(key, value, propSchema)
		if (error) errors.push(error)
	}
	return errors
}

function validateAgainstSchema(
	body: unknown,
	schema: SchemaProperty,
): string[] {
	if (!schema || typeof body !== "object" || body === null) return []
	if (schema.type === "array") return validateArraySchema(body)
	if (!schema.properties) return []

	return [
		...collectMissingRequiredFields(body, schema.required ?? []),
		...validateProperties(body, schema.properties),
	]
}

function getResponseSchema(
	request: FastifyRequest,
	statusCode: number,
): SchemaProperty | undefined {
	const routeSchema = request.routeOptions?.schema?.response
	if (!routeSchema) return undefined
	return (routeSchema as Record<string, unknown>)[String(statusCode)] as
		| SchemaProperty
		| undefined
}

function logValidationErrors(
	request: FastifyRequest,
	statusCode: number,
	errors: string[],
): void {
	console.warn(
		`[ResponseValidation] ${request.method} ${request.url} (${statusCode}): Response does not match schema`,
		{ errors },
	)
}

function validatePayload(
	request: FastifyRequest,
	statusCode: number,
	schema: SchemaProperty,
	payload: unknown,
): void {
	try {
		const body = JSON.parse(payload as string)
		const errors = validateAgainstSchema(body, schema)
		if (errors.length > 0) logValidationErrors(request, statusCode, errors)
	} catch {
		// Non-JSON responses are skipped
	}
}

function isValidationDisabled(): boolean {
	return (
		process.env.NODE_ENV === "production" ||
		process.env.RESPONSE_VALIDATION_ENABLED === "false"
	)
}

export class ResponseValidationHook {
	static register(server: FastifyInstance): void {
		if (isValidationDisabled()) return

		server.addHook(
			"onSend",
			async (
				request: FastifyRequest,
				reply: FastifyReply,
				payload: unknown,
			) => {
				const schema = getResponseSchema(request, reply.statusCode)
				if (schema) validatePayload(request, reply.statusCode, schema, payload)
				return payload
			},
		)
	}
}
