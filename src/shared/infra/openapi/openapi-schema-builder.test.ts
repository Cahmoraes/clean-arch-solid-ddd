import { describe, expect, it } from "vitest"
import { z } from "zod"

import { OpenApiSchemaBuilder } from "./openapi-schema-builder.js"

describe("OpenApiSchemaBuilder", () => {
	it("should generate schema with tags, summary and description", () => {
		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Create a user",
			description: "Creates a new user in the system",
		})

		expect(result.tags).toEqual(["users"])
		expect(result.summary).toBe("Create a user")
		expect(result.description).toBe("Creates a new user in the system")
	})

	it("should convert body schema with string, number and boolean fields", () => {
		const bodySchema = z.object({
			name: z.string(),
			age: z.number(),
			active: z.boolean(),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Create user",
			body: bodySchema,
		})

		const body = result.body as any
		expect(body.type).toBe("object")
		expect(body.properties.name.type).toBe("string")
		expect(body.properties.age.type).toBe("number")
		expect(body.properties.active.type).toBe("boolean")
		expect(body.required).toEqual(["name", "age", "active"])
	})

	it("should convert body schema with optional fields", () => {
		const bodySchema = z.object({
			name: z.string(),
			nickname: z.string().optional(),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Create user",
			body: bodySchema,
		})

		const body = result.body as any
		expect(body.required).toEqual(["name"])
		expect(body.properties.nickname).toBeDefined()
	})

	it("should convert body schema with enum fields", () => {
		const bodySchema = z.object({
			role: z.enum(["ADMIN", "MEMBER"]),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Create user",
			body: bodySchema,
		})

		const body = result.body as any
		expect(body.properties.role.enum).toEqual(["ADMIN", "MEMBER"])
	})

	it("should convert body schema with array fields", () => {
		const bodySchema = z.object({
			tags: z.array(z.string()),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Create user",
			body: bodySchema,
		})

		const body = result.body as any
		expect(body.properties.tags.type).toBe("array")
		expect(body.properties.tags.items.type).toBe("string")
	})

	it("should convert body schema with nested objects", () => {
		const bodySchema = z.object({
			address: z.object({
				street: z.string(),
				city: z.string(),
			}),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Create user",
			body: bodySchema,
		})

		const body = result.body as any
		expect(body.properties.address.type).toBe("object")
		expect(body.properties.address.properties.street.type).toBe("string")
		expect(body.properties.address.properties.city.type).toBe("string")
	})

	it("should convert querystring schema", () => {
		const querySchema = z.object({
			page: z.coerce.number().default(1),
			limit: z.coerce.number().default(10),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "List users",
			querystring: querySchema,
		})

		expect(result.querystring).toBeDefined()
		const qs = result.querystring as any
		expect(qs.properties.page).toBeDefined()
		expect(qs.properties.limit).toBeDefined()
	})

	it("should convert params schema", () => {
		const paramsSchema = z.object({
			userId: z.string(),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Get user",
			params: paramsSchema,
		})

		expect(result.params).toBeDefined()
		const params = result.params as any
		expect(params.properties.userId.type).toBe("string")
	})

	it("should generate response schemas with descriptions", () => {
		const responseSchema = z.object({
			message: z.string(),
			email: z.string(),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Create user",
			responses: {
				201: {
					description: "User created successfully",
					schema: responseSchema,
				},
				400: { description: "Bad Request" },
			},
		})

		const response = result.response as any
		expect(response[201].description).toBe("User created successfully")
		expect(response[201].properties.message.type).toBe("string")
		expect(response[201].properties.email.type).toBe("string")
		expect(response[400].description).toBe("Bad Request")
	})

	it("should generate security field for protected routes", () => {
		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Get profile",
			security: true,
		})

		expect(result.security).toEqual([{ bearerAuth: [] }])
	})

	it("should not include security field when not specified", () => {
		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Create user",
		})

		expect(result.security).toBeUndefined()
	})

	it("should convert z.coerce.number", () => {
		const schema = z.object({
			count: z.coerce.number(),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Test",
			body: schema,
		})

		const body = result.body as any
		expect(body.properties.count.type).toBe("number")
	})

	it("should convert schema with .meta() descriptions", () => {
		const schema = z.object({
			email: z.string().meta({ description: "User email address" }),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Test",
			body: schema,
		})

		const body = result.body as any
		expect(body.properties.email.description).toBe("User email address")
	})

	it("should convert schema with .meta() examples", () => {
		const schema = z.object({
			name: z.string().meta({ example: "John Doe" }),
		})

		const result = OpenApiSchemaBuilder.build({
			tags: ["users"],
			summary: "Test",
			body: schema,
		})

		const body = result.body as any
		expect(body.properties.name.example).toBe("John Doe")
	})
})
