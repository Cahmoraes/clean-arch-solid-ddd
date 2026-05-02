import type { z } from "zod"
import { createSchema } from "zod-openapi"

import type { Schema } from "@/shared/infra/server/http-server.js"

interface ResponseDefinition {
	description: string
	schema?: z.ZodType
}

export interface OpenApiSchemaBuilderInput {
	body?: z.ZodType
	querystring?: z.ZodType
	params?: z.ZodType
	responses?: Record<number, ResponseDefinition>
	tags: string[]
	summary: string
	description?: string
	security?: boolean
}

export class OpenApiSchemaBuilder {
	public static build(input: OpenApiSchemaBuilderInput): Schema {
		const schema: Schema = {
			tags: input.tags,
			summary: input.summary,
			description: input.description,
		}

		if (input.body) {
			schema.body = OpenApiSchemaBuilder.convertZodToJsonSchema(input.body)
		}

		if (input.querystring) {
			schema.querystring = OpenApiSchemaBuilder.convertZodToJsonSchema(
				input.querystring,
			)
		}

		if (input.params) {
			schema.params = OpenApiSchemaBuilder.convertZodToJsonSchema(input.params)
		}

		if (input.responses) {
			schema.response = OpenApiSchemaBuilder.buildResponses(input.responses)
		}

		if (input.security) {
			schema.security = [{ bearerAuth: [] }]
		}

		return schema
	}

	private static convertZodToJsonSchema(zodSchema: z.ZodType): object {
		const { schema } = createSchema(zodSchema)
		return schema
	}

	private static buildResponses(
		responses: Record<number, ResponseDefinition>,
	): Record<number, object> {
		const result: Record<number, object> = {}
		for (const [statusCode, definition] of Object.entries(responses)) {
			if (definition.schema) {
				result[Number(statusCode)] = {
					description: definition.description,
					...OpenApiSchemaBuilder.convertZodToJsonSchema(definition.schema),
				}
			} else {
				result[Number(statusCode)] = {
					description: definition.description,
					type: "object",
					properties: {},
				}
			}
		}
		return result
	}
}
