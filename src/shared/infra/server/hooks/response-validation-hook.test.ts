import fastify, { type FastifyInstance } from "fastify"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ResponseValidationHook } from "./response-validation-hook.js"

describe("ResponseValidationHook", () => {
	let server: FastifyInstance

	beforeEach(() => {
		server = fastify()
	})

	afterEach(async () => {
		await server.close()
		vi.restoreAllMocks()
	})

	it("should not generate warning for valid response", async () => {
		const warnSpy = vi.spyOn(console, "warn")
		vi.stubEnv("NODE_ENV", "test")
		vi.stubEnv("RESPONSE_VALIDATION_ENABLED", "true")

		ResponseValidationHook.register(server)

		server.get(
			"/test",
			{
				schema: {
					response: {
						200: {
							type: "object",
							properties: {
								name: { type: "string" },
								age: { type: "number" },
							},
							required: ["name", "age"],
						},
					},
				},
			},
			async () => {
				return { name: "John", age: 30 }
			},
		)

		await server.ready()
		const response = await server.inject({
			method: "GET",
			url: "/test",
		})

		expect(response.statusCode).toBe(200)
		expect(warnSpy).not.toHaveBeenCalled()
	})

	it("should generate warning for response with missing required field", async () => {
		const warnSpy = vi.spyOn(console, "warn")
		vi.stubEnv("NODE_ENV", "test")
		vi.stubEnv("RESPONSE_VALIDATION_ENABLED", "true")

		ResponseValidationHook.register(server)

		server.get(
			"/test",
			{
				schema: {
					response: {
						200: {
							type: "object",
							properties: {
								name: { type: "string" },
								email: { type: "string" },
							},
							required: ["name", "email"],
						},
					},
				},
			},
			async (_request, reply) => {
				reply.serializer((payload: unknown) => JSON.stringify(payload))
				return reply.status(200).send({ name: "John" })
			},
		)

		await server.ready()
		const response = await server.inject({
			method: "GET",
			url: "/test",
		})

		expect(response.statusCode).toBe(200)
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("[ResponseValidation]"),
			expect.objectContaining({
				errors: expect.arrayContaining([expect.stringContaining("email")]),
			}),
		)
	})

	it("should not modify the response", async () => {
		vi.stubEnv("NODE_ENV", "test")
		vi.stubEnv("RESPONSE_VALIDATION_ENABLED", "true")

		ResponseValidationHook.register(server)

		const expectedBody = { name: "John", age: 30 }

		server.get(
			"/test",
			{
				schema: {
					response: {
						200: {
							type: "object",
							properties: {
								name: { type: "string" },
								age: { type: "number" },
							},
							required: ["name", "age"],
						},
					},
				},
			},
			async () => {
				return expectedBody
			},
		)

		await server.ready()
		const response = await server.inject({
			method: "GET",
			url: "/test",
		})

		expect(response.statusCode).toBe(200)
		expect(JSON.parse(response.body)).toEqual(expectedBody)
	})

	it("should not be registered when RESPONSE_VALIDATION_ENABLED is false", async () => {
		const warnSpy = vi.spyOn(console, "warn")
		vi.stubEnv("NODE_ENV", "test")
		vi.stubEnv("RESPONSE_VALIDATION_ENABLED", "false")

		ResponseValidationHook.register(server)

		server.get(
			"/test",
			{
				schema: {
					response: {
						200: {
							type: "object",
							properties: {
								name: { type: "string" },
							},
							required: ["name"],
						},
					},
				},
			},
			async (_request, reply) => {
				reply.serializer((payload: unknown) => JSON.stringify(payload))
				return reply.status(200).send({})
			},
		)

		await server.ready()
		await server.inject({
			method: "GET",
			url: "/test",
		})

		expect(warnSpy).not.toHaveBeenCalled()
	})

	it("should not be registered in production", async () => {
		const warnSpy = vi.spyOn(console, "warn")
		vi.stubEnv("NODE_ENV", "production")
		vi.stubEnv("RESPONSE_VALIDATION_ENABLED", "true")

		ResponseValidationHook.register(server)

		server.get(
			"/test",
			{
				schema: {
					response: {
						200: {
							type: "object",
							properties: {
								name: { type: "string" },
							},
							required: ["name"],
						},
					},
				},
			},
			async (_request, reply) => {
				reply.serializer((payload: unknown) => JSON.stringify(payload))
				return reply.status(200).send({})
			},
		)

		await server.ready()
		await server.inject({
			method: "GET",
			url: "/test",
		})

		expect(warnSpy).not.toHaveBeenCalled()
	})

	it("should generate warning for response with wrong type", async () => {
		const warnSpy = vi.spyOn(console, "warn")
		vi.stubEnv("NODE_ENV", "test")
		vi.stubEnv("RESPONSE_VALIDATION_ENABLED", "true")

		ResponseValidationHook.register(server)

		server.get(
			"/test",
			{
				schema: {
					response: {
						200: {
							type: "object",
							properties: {
								age: { type: "number" },
							},
							required: ["age"],
						},
					},
				},
			},
			async (_request, reply) => {
				reply.serializer((payload: unknown) => JSON.stringify(payload))
				return reply.status(200).send({ age: "not-a-number" })
			},
		)

		await server.ready()
		const response = await server.inject({
			method: "GET",
			url: "/test",
		})

		expect(response.statusCode).toBe(200)
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("[ResponseValidation]"),
			expect.objectContaining({
				errors: expect.arrayContaining([expect.stringContaining("age")]),
			}),
		)
	})
})
