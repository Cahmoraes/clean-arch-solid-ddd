# Task 3: Rate Limit no ResetPasswordController

**Status:** DONE
**PRD:** N/A
**Spec:** `../../../../apps/backend/reports/security-review-2026-05-18.md`

## Visão Geral

O endpoint `POST /reset-password` não tem rate limiting, criando assimetria com `POST /forgot-password` que já tem `rateLimit: { max: 5, timeWindow: 15min }`. Sem rate limit, um atacante pode fazer flood de requisições para esgotar recursos do servidor (DoS).

A correção é trivial: adicionar a opção `rateLimit` ao `server.register()` no `ResetPasswordController`, espelhando exatamente o que `ForgotPasswordController` já faz.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/reset-password.controller.ts`

### Conformidade com as Skills Padrão

- no-workarounds: usar a mesma constante `RATE_LIMIT_CONFIG.FORGOT_PASSWORD` já definida, não inventar valores mágicos

## Passos

- [ ] **Step 1: Verificar o padrão existente em ForgotPasswordController**

Confirme como o rate limit está configurado no `forgot-password.controller.ts`:

```bash
grep -A5 "rateLimit" apps/backend/src/user/infra/controller/forgot-password.controller.ts
```

Esperado (para referência):
```typescript
rateLimit: {
  max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAX,
  timeWindow: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.TIME_WINDOW,
},
```

Os valores em `RATE_LIMIT_CONFIG.FORGOT_PASSWORD`:
- `MAX = 5` (5 requisições)
- `TIME_WINDOW = 15 * 60 * 1000` (15 minutos em ms)

- [ ] **Step 2: Adicionar import de RATE_LIMIT_CONFIG e rateLimit ao ResetPasswordController**

Abra `apps/backend/src/user/infra/controller/reset-password.controller.ts`.

**Adicionar import** (após os imports existentes, antes da linha `const resetPasswordSchema`):

```typescript
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
```

**Modificar o método `init()`** — adicionar a opção `rateLimit`:

**Antes:**
```typescript
public async init(): Promise<void> {
  await this.server.register(
    "post",
    UserRoutes.RESET_PASSWORD,
    {
      callback: this.callback,
    },
    makeResetPasswordSwaggerSchema(),
  )
}
```

**Depois:**
```typescript
public async init(): Promise<void> {
  await this.server.register(
    "post",
    UserRoutes.RESET_PASSWORD,
    {
      callback: this.callback,
      rateLimit: {
        max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAX,
        timeWindow: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.TIME_WINDOW,
      },
    },
    makeResetPasswordSwaggerSchema(),
  )
}
```

O arquivo completo resultante de `reset-password.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { ZodError, z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { ResetPasswordUseCase } from "@/user/application/use-case/reset-password.usecase"
import { UserRoutes } from "./routes/user-routes"

const resetPasswordSchema = z.object({
	token: z.string().min(1).meta({
		description: "Password reset token",
		example: "12ab34cd56ef78gh90ij12kl34mn56op",
	}),
	newPassword: z.string().min(8).max(128).meta({
		description: "New password (min 8 characters)",
		example: "NewPass456!",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

export class ResetPasswordController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.ResetPassword)
		private readonly resetPassword: ResetPasswordUseCase,
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
		await this.server.register(
			"post",
			UserRoutes.RESET_PASSWORD,
			{
				callback: this.callback,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAX,
					timeWindow: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.TIME_WINDOW,
				},
			},
			makeResetPasswordSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}
		if (error.name === "InvalidResetTokenError") {
			return ResponseFactory.BAD_REQUEST({
				message: "Token inválido ou expirado.",
			})
		}
		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(resetPasswordSchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}
		const result = await this.resetPassword.execute({
			token: parsedBodyOrError.value.token,
			newPassword: parsedBodyOrError.value.newPassword,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.NO_CONTENT()
	}
}

function makeResetPasswordSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Reset password",
		description: "Reset the user password using a valid password reset token.",
		body: resetPasswordSchema,
		responses: {
			204: { description: "Password reset successfully" },
			400: { description: "Bad Request", schema: errorResponseSchema },
			404: { description: "User not found", schema: errorResponseSchema },
			422: { description: "Unprocessable Entity", schema: errorResponseSchema },
			429: { description: "Too Many Requests", schema: errorResponseSchema },
		},
	})
}
```

- [ ] **Step 3: Executar lint e type check**

```bash
pnpm --filter backend biome:fix && pnpm --filter backend tsc:check
```

Esperado: zero erros em ambos.

- [ ] **Step 4: Executar todos os testes para confirmar que não quebrou nada**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/user/infra/controller/reset-password.controller.ts
git commit -m "security: add rate limiting to POST /reset-password

Mirror the same rate limit config used by POST /forgot-password:
max 5 requests per 15 minutes per IP. Prevents DoS via flood.

Closes OWASP A07:2021 – Identification and Authentication Failures finding.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `reset-password.controller.ts` importa `RATE_LIMIT_CONFIG` de `@/shared/infra/server/plugins/rate-limit-config.js`
- O registro da rota inclui `rateLimit: { max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAX, timeWindow: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.TIME_WINDOW }`
- `pnpm --filter backend biome:fix` e `pnpm --filter backend tsc:check` sem erros
- `pnpm --filter backend test:run` passa 100%
