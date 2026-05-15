import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { GoogleAuthProvider } from "@/session/application/provider/google-auth-provider.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { isProduction } from "@/shared/infra/env/index.js"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { HttpServer } from "@/shared/infra/server/http-server.js"
import { SessionRoutes } from "./routes/session-routes.js"

const devGoogleTokenBodySchema = z.object({
	idToken: z.string().min(1),
	sub: z.string().min(1),
	email: z.string().email(),
	name: z.string().min(1),
	emailVerified: z.boolean().default(true),
})

@injectable()
export class DevGoogleTokenController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(AUTH_TYPES.Providers.GoogleAuth)
		private readonly googleAuthProvider: GoogleAuthProvider,
	) {
		super()
		this.callback = this.callback.bind(this)
	}

	public async init(): Promise<void> {
		if (isProduction()) return
		this.server.register("post", SessionRoutes.DEV_GOOGLE_TOKEN, {
			callback: this.callback,
		})
	}

	private async callback(req: FastifyRequest) {
		const parsedBody = this.parseRequest(devGoogleTokenBodySchema, req.body)
		if (parsedBody.isFailure()) return this.createResponseError(parsedBody)

		if (!(this.googleAuthProvider instanceof InMemoryGoogleAuthProvider)) {
			return ResponseFactory.NOT_FOUND({ message: "Not Found" })
		}

		this.googleAuthProvider.addValidToken(parsedBody.value.idToken, {
			sub: parsedBody.value.sub,
			email: parsedBody.value.email,
			name: parsedBody.value.name,
			emailVerified: parsedBody.value.emailVerified,
		})

		return ResponseFactory.CREATED({ body: { ok: true } })
	}
}
