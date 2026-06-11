import type { FastifyDynamicSwaggerOptions } from "@fastify/swagger"
import { env } from "@/shared/infra/env"

export class FastifySwaggerSetupFactory {
	public static create(): Pick<FastifyDynamicSwaggerOptions, "openapi"> {
		return {
			openapi: {
				openapi: "3.0.0",
				info: {
					title: "Clean Arch Solid DDD API",
					description:
						"API for gym check-in management system built with Clean Architecture, SOLID principles, and Domain-Driven Design.",
					version: "1.0.0",
					contact: {
						name: "API Support",
						email: "support@api.com",
					},
				},
				servers: [
					{
						url: `http://localhost:${env.PORT}`,
						description: "Development server",
					},
				],
				components: {
					securitySchemes: {
						bearerAuth: {
							type: "http",
							scheme: "bearer",
							bearerFormat: "JWT",
							description: "JWT token obtained from POST /sessions",
						},
					},
				},
				tags: [
					{ name: "users", description: "User management endpoints" },
					{
						name: "sessions",
						description: "Authentication and session management endpoints",
					},
					{ name: "gyms", description: "Gym management endpoints" },
					{
						name: "check-ins",
						description: "Check-in management endpoints",
					},
					{
						name: "subscriptions",
						description: "Subscription and payment endpoints",
					},
					{
						name: "health",
						description: "Health check and monitoring endpoints",
					},
				],
			},
		}
	}
}
