# Task 7: Controller + Rotas + IoC + Business Flow Tests [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-015]

**Status:** PENDING
**PRD:** `../prd/prd-google-social-login.md`
**Spec:** `../specs/google-social-login-design.md`

## Visão Geral

Registrar os novos símbolos no IoC, criar o controller do endpoint `POST /sessions/google`, adicionar a rota, registrar os bindings no container, e escrever os Business Flow Tests de integração HTTP.

## Arquivos

- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/auth-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/session/session-module.ts`
- Modify: `apps/backend/src/session/infra/controller/routes/session-routes.ts`
- Create: `apps/backend/src/session/infra/controller/authenticate-with-google.controller.ts`
- Create: `apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts`
- Modify: `apps/backend/src/shared/infra/controller/base-controller.ts`

## Passos

- [ ] **Step 1: Adicionar símbolos ao auth-types.ts**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/auth-types.ts`:

```typescript
export const AUTH_TYPES = {
	UseCases: {
		Authenticate: Symbol.for("AuthenticateUseCase"),
		AuthenticateWithGoogle: Symbol.for("AuthenticateWithGoogleUseCase"),
		Logout: Symbol.for("LogoutUseCase"),
		RefreshToken: Symbol.for("RefreshTokenUseCase"),
	},
	Controllers: {
		Authenticate: Symbol.for("AuthenticateController"),
		AuthenticateWithGoogle: Symbol.for("AuthenticateWithGoogleController"),
		Logout: Symbol.for("LogoutController"),
		RefreshToken: Symbol.for("RefreshTokenController"),
	},
	DAO: {
		RevokedToken: Symbol.for("RevokedTokenDAO"),
	},
	Providers: {
		GoogleAuth: Symbol.for("GoogleAuthProvider"),
	},
} as const
```

- [ ] **Step 2: Adicionar rota ao session-routes.ts**

Em `apps/backend/src/session/infra/controller/routes/session-routes.ts`:

```typescript
const PREFIX = "/sessions"

export const SessionRoutes = {
	AUTHENTICATE: PREFIX,
	AUTHENTICATE_GOOGLE: `${PREFIX}/google`,
	REFRESH: `${PREFIX}/refresh`,
	LOGOUT: `${PREFIX}/logout`,
} as const

export type SessionRoutes = (typeof SessionRoutes)[keyof typeof SessionRoutes]
```

- [ ] **Step 3: Registrar erros no BaseController**

Em `apps/backend/src/shared/infra/controller/base-controller.ts`, adicionar `"InvalidGoogleTokenError"` ao set `UNAUTHORIZED_ERRORS`:

```typescript
const UNAUTHORIZED_ERRORS = new Set([
	"InvalidCredentialsError",
	"InvalidUserTokenError",
	"TokenAlreadyRevokedError",
	"InvalidGoogleTokenError",
])
```

O `GoogleEmailNotVerifiedError` já será mapeado automaticamente pelo prefixo `"Invalid"` → `UNPROCESSABLE_ENTITY`, mas como o nome começa com "Google", precisamos verificar. O nome é `"GoogleEmailNotVerifiedError"` — ele não encaixa no padrão `startsWith("Invalid")`. Vamos usar o `mapResponseError` no controller para mapear explicitamente.

- [ ] **Step 4: Criar AuthenticateWithGoogleController**

Criar `apps/backend/src/session/infra/controller/authenticate-with-google.controller.ts`:

```typescript
import type { FastifyReply, FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { AuthenticateWithGoogleUseCase } from "@/session/application/use-case/authenticate-with-google.usecase.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import type { CookieManager } from "@/shared/infra/cookie/cookie-manager.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { env } from "@/shared/infra/env/index.js"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server.js"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import { SessionRoutes } from "./routes/session-routes.js"

const authenticateWithGoogleRequestSchema = z.object({
	idToken: z
		.string()
		.min(1)
		.meta({
			description: "Google ID Token obtained from Google Identity Services",
			example: "eyJhbGciOiJSUzI1NiIs...",
		}),
})

export class AuthenticateWithGoogleController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(AUTH_TYPES.UseCases.AuthenticateWithGoogle)
		private readonly authenticateWithGoogleUseCase: AuthenticateWithGoogleUseCase,
		@inject(SHARED_TYPES.Cookies.Manager)
		private readonly cookieManager: CookieManager,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	public async init(): Promise<void> {
		this.server.register(
			"post",
			SessionRoutes.AUTHENTICATE_GOOGLE,
			{
				callback: this.callback,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeAuthenticateWithGoogleSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error)) {
			return undefined
		}

		if (error.name === "GoogleEmailNotVerifiedError") {
			return ResponseFactory.UNPROCESSABLE_ENTITY({
				message: error.message,
			})
		}

		return undefined
	}

	private async callback(req: FastifyRequest, res: FastifyReply) {
		const parsedBodyResult = this.parseRequest(
			authenticateWithGoogleRequestSchema,
			req.body,
		)
		if (parsedBodyResult.isFailure()) {
			return this.createResponseError(parsedBodyResult)
		}

		const result = await this.authenticateWithGoogleUseCase.execute({
			idToken: parsedBodyResult.value.idToken,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		res.header(
			"set-cookie",
			this.encodeRefreshTokenCookie(result.value.refreshToken),
		)
		return ResponseFactory.OK({
			body: result.value,
		})
	}

	private encodeRefreshTokenCookie(aString: string): string {
		return this.cookieManager.serialize(env.REFRESH_TOKEN_NAME, aString, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "strict",
		})
	}
}

function makeAuthenticateWithGoogleSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["sessions"],
		summary: "Authenticate with Google",
		description:
			"Authenticate using a Google ID Token to obtain JWT token and refresh token cookie",
		body: authenticateWithGoogleRequestSchema,
		responses: {
			200: {
				description: "Authentication successful",
				schema: z.object({
					token: z
						.string()
						.meta({ description: "JWT access token", example: "eyJhbG..." }),
					refreshToken: z
						.string()
						.meta({ description: "Refresh token", example: "eyJhbG..." }),
				}),
			},
			400: {
				description: "Invalid request body",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			401: {
				description: "Invalid Google token",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			422: {
				description: "Google email not verified",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
```

- [ ] **Step 5: Registrar bindings no session-module.ts**

Em `apps/backend/src/shared/infra/ioc/module/session/session-module.ts`:

```typescript
import { ContainerModule } from "inversify"

import { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { AuthenticateWithGoogleUseCase } from "@/session/application/use-case/authenticate-with-google.usecase"
import { LogoutUseCase } from "@/session/application/use-case/logout.usecase"
import { AuthenticateController } from "@/session/infra/controller/authenticate.controller"
import { AuthenticateWithGoogleController } from "@/session/infra/controller/authenticate-with-google.controller"
import { LogoutController } from "@/session/infra/controller/logout.controller"
import { GoogleAuthProviderImpl } from "@/session/infra/provider/google-auth-provider-impl"

import { AUTH_TYPES } from "../../types"
import { RevokedTokenDAOProvider } from "./revoked-token-dao-provider"

export const sessionModule = new ContainerModule(({ bind }) => {
	bind(AUTH_TYPES.Controllers.Authenticate).to(AuthenticateController)
	bind(AUTH_TYPES.Controllers.AuthenticateWithGoogle).to(AuthenticateWithGoogleController)
	bind(AUTH_TYPES.Controllers.Logout).to(LogoutController)
	bind(AUTH_TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
	bind(AUTH_TYPES.UseCases.AuthenticateWithGoogle).to(AuthenticateWithGoogleUseCase)
	bind(AUTH_TYPES.UseCases.Logout).to(LogoutUseCase)
	bind(AUTH_TYPES.Providers.GoogleAuth).to(GoogleAuthProviderImpl)
	bind(AUTH_TYPES.DAO.RevokedToken)
		.toDynamicValue(RevokedTokenDAOProvider.provide)
		.inSingletonScope()
})
```

- [ ] **Step 6: Verificar se existe bootstrap para controllers do session**

Verificar como os controllers do `session` são inicializados no bootstrap. Os controllers são obtidos do container e têm `init()` chamado. Localizar o arquivo e adicionar `AuthenticateWithGoogleController` ao bootstrap, seguindo o mesmo padrão dos controllers existentes.

```bash
grep -r "AuthenticateController" apps/backend/src/bootstrap/ --include="*.ts"
```

Adicionar a inicialização do `AuthenticateWithGoogleController` seguindo o mesmo padrão.

- [ ] **Step 7: Escrever Business Flow Tests**

Criar `apps/backend/src/session/infra/controller/authenticate-with-google.business-flow-test.ts`:

```typescript
import setCookieParser from "set-cookie-parser"
import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"

import type { User as UserToken } from "@/@types/custom"
import type { JsonWebTokenAdapter } from "@/shared/infra/auth/json-web-token-adapter"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider"
import { User } from "@/user/domain/user"
import { RoleValues } from "@/user/domain/value-object/role"

import { SessionRoutes } from "./routes/session-routes"

interface Cookie {
	refreshToken: {
		name: string
		value: string
		path: string
		httpOnly: boolean
		secure: boolean
		sameSite: string
	}
}

const VALID_TOKEN = "valid-google-id-token"
const GOOGLE_USER = {
	sub: "google-sub-123",
	email: "google@example.com",
	name: "Google User",
	emailVerified: true,
}

describe("Autenticar Usuário com Google", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let jwtAdapter: JsonWebTokenAdapter
	let googleAuthProvider: InMemoryGoogleAuthProvider

	beforeEach(async () => {
		const inMemoryRepository = new InMemoryUserRepository()
		googleAuthProvider = new InMemoryGoogleAuthProvider()
		container.snapshot()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(inMemoryRepository)
		container
			.rebind(AUTH_TYPES.Providers.GoogleAuth)
			.toConstantValue(googleAuthProvider)
		userRepository = container.get<InMemoryUserRepository>(
			USER_TYPES.Repositories.User,
		)
		jwtAdapter = container.get(SHARED_TYPES.Tokens.Auth)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve autenticar um novo usuário com Google", async () => {
		googleAuthProvider.addValidToken(VALID_TOKEN, GOOGLE_USER)

		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: VALID_TOKEN })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toHaveProperty("token")
		expect(response.body).toHaveProperty("refreshToken")

		const parsedCookie = setCookieParser(response.headers["set-cookie"], {
			map: true,
		}) as unknown as Cookie
		expect(parsedCookie.refreshToken.name).toBe(env.REFRESH_TOKEN_NAME)
		expect(parsedCookie.refreshToken.httpOnly).toBe(true)
		expect(parsedCookie.refreshToken.secure).toBe(true)

		const token = response.body.token
		const tokenSubject = jwtAdapter
			.verify<UserToken>(token, env.PRIVATE_KEY)
			.force.success().value.sub
		expect(tokenSubject.email).toBe(GOOGLE_USER.email)
		expect(tokenSubject.id).toEqual(expect.any(String))
		expect(tokenSubject.role).toBe(RoleValues.MEMBER)
	})

	test("Deve retornar 401 para token Google inválido", async () => {
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "invalid-token" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
		expect(response.body).toHaveProperty("message")
	})

	test("Token emitido por Google login deve acessar rota protegida", async () => {
		googleAuthProvider.addValidToken(VALID_TOKEN, GOOGLE_USER)

		const authResponse = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: VALID_TOKEN })

		expect(authResponse.status).toBe(HTTP_STATUS.OK)
		const { token } = authResponse.body

		const protectedResponse = await request(fastifyServer.server)
			.get("/users/me")
			.set("Authorization", `Bearer ${token}`)

		expect(protectedResponse.status).not.toBe(HTTP_STATUS.UNAUTHORIZED)
	})

	test("Deve vincular google_id a conta existente por email", async () => {
		googleAuthProvider.addValidToken(VALID_TOKEN, GOOGLE_USER)

		const existingUser = (
			await User.create({
				name: "Existing User",
				email: GOOGLE_USER.email,
				password: "any_password",
			})
		).force.success().value
		await userRepository.save(existingUser)

		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: VALID_TOKEN })

		expect(response.status).toBe(HTTP_STATUS.OK)

		const updatedUser = await userRepository.userOfEmail(GOOGLE_USER.email)
		expect(updatedUser!.googleId).toBe(GOOGLE_USER.sub)
	})
})
```

- [ ] **Step 8: Verificar compilação**

```bash
pnpm --filter backend tsc:check
```

Esperado: sem erros de tipo.

- [ ] **Step 9: Rodar todos os testes**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam (unitários existentes + novos + business flow).

- [ ] **Step 10: Rodar biome**

```bash
pnpm --filter backend biome:fix
```

Esperado: zero issues.

- [ ] **Step 11: Build completo**

```bash
pnpm --filter backend build
```

Esperado: build bem-sucedido.

- [ ] **Step 12: Commit final**

```bash
git add apps/backend/src/shared/infra/ioc apps/backend/src/session/infra apps/backend/src/shared/infra/controller/base-controller.ts
git commit -m "feat(backend): add Google social login controller, IoC bindings and business flow tests"
```

## Critérios de Sucesso

- `POST /sessions/google` retorna 200 com tokens válidos (RF-001, RF-002)
- `POST /sessions/google` com token inválido retorna 401 (RF-003)
- `POST /sessions/google` é público (RF-005)
- Token emitido funciona em rotas protegidas (RF-006)
- Vinculação automática por email funciona via HTTP (RF-008)
- Cadastro tradicional `POST /users` continua exigindo senha (RF-015)
- `biome:fix` + `tsc:check` + `test:run` + `build` passam
