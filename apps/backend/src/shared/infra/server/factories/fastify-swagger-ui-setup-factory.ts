import type { FastifySwaggerUiOptions } from "@fastify/swagger-ui"

export class FastifySwaggerUISetupFactory {
	public static create(): FastifySwaggerUiOptions {
		return {
			routePrefix: "/documentation",
			uiConfig: {
				docExpansion: "list",
				deepLinking: true,
				tagsSorter: "alpha",
				operationsSorter: "alpha",
			},
			staticCSP: true,
			transformStaticCSP: (header: string) => header,
			transformSpecification: (
				swaggerObject: Readonly<Record<string, any>>,
			) => {
				return swaggerObject
			},
			transformSpecificationClone: true,
		}
	}
}
