import "reflect-metadata"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { serverBuild } from "@/bootstrap/server-build.js"
import { GoogleAuthProviderImpl } from "@/session/infra/provider/google-auth-provider-impl.js"
import { container } from "@/shared/infra/ioc/container.js"
import { AUTH_TYPES } from "@/shared/infra/ioc/module/service-identifier/auth-types.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/module/service-identifier/notification-types.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { FastifyAdapter } from "@/shared/infra/server/fastify-adapter.js"

type SpecResponse = { content?: unknown; description?: string }
type SpecOperation = { responses?: Record<string, SpecResponse> }
type SpecPaths = Record<string, Record<string, SpecOperation>>

function stripContentFromOperation(operation: SpecOperation): void {
	const noContent = operation.responses?.["204"]
	if (noContent?.content) {
		delete noContent.content
	}
}

function sanitizeNoContentResponses(spec: { paths?: SpecPaths }): void {
	if (!spec.paths) return
	for (const methods of Object.values(spec.paths)) {
		for (const operation of Object.values(methods)) {
			stripContentFromOperation(operation)
		}
	}
}

async function exportSpec(): Promise<void> {
	container
		.rebind(SHARED_TYPES.Server.Fastify)
		.to(FastifyAdapter)
		.inSingletonScope()

	// A spec so depende das rotas: neutraliza integracoes que exigem infra
	// (RabbitMQ/Redis), no mesmo padrao de test/setup-test.ts
	container
		.rebind(NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn)
		.toConstantValue({ subscribe: () => undefined })
	container
		.rebind(NOTIFICATION_TYPES.Infra.NotificationBroadcastSubscriber)
		.toConstantValue({
			start: async () => undefined,
			stop: async () => undefined,
		})
	container
		.rebind(NOTIFICATION_TYPES.Infra.NotificationQueueWorker)
		.toConstantValue({ init: async () => undefined })
	// Provider real, como em producao: evita expor a rota dev-token na spec
	container
		.rebind(AUTH_TYPES.Providers.GoogleAuth)
		.to(GoogleAuthProviderImpl)
		.inSingletonScope()

	const server = await serverBuild()
	await server.ready()

	const spec = server.swagger() as { paths?: SpecPaths }
	sanitizeNoContentResponses(spec)
	const paths = Object.keys(spec.paths ?? {})
	const endpointCount = paths.length

	if (endpointCount === 0) {
		console.error("Erro: spec OpenAPI gerada nao contem endpoints.")
		await server.close()
		process.exit(1)
	}

	const outputDir = resolve(process.cwd(), "docs")
	mkdirSync(outputDir, { recursive: true })

	const outputPath = resolve(outputDir, "openapi-spec.json")
	writeFileSync(outputPath, JSON.stringify(spec, null, "\t"))

	console.log(`Spec OpenAPI exportada com sucesso: ${outputPath}`)
	console.log(`Endpoints encontrados: ${endpointCount}`)
	console.log(`Paths: ${paths.join(", ")}`)

	await server.close()
	process.exit(0)
}

exportSpec().catch((error) => {
	console.error("Erro ao exportar spec OpenAPI:", error)
	process.exit(1)
})
