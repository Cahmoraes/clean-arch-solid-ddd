# Task 2: Backend — Endpoint `POST /contact` [FR-014, FR-015]

**Status:** DONE
**PRD:** `../prd/prd-home-planos-contato.md`
**Spec:** `../specs/home-planos-contato-design.md`
**Depends on:** N/A

## Visão Geral

Criar o bounded context `contact` no backend com o endpoint `POST /contact` que recebe `{ nome, email, mensagem }`, valida o payload com Zod e envia um e-mail para `contato@volt.com` via `MailerGateway` (nodemailer). Segue o mesmo padrão de outros bounded contexts: types IoC → use case → controller → módulo → bootstrap.

## Arquivos

- Create: `apps/backend/src/contact/infra/ioc/contact-types.ts`
- Create: `apps/backend/src/contact/application/use-cases/send-contact-email/send-contact-email.use-case.ts`
- Create: `apps/backend/src/contact/infra/http/contact-routes.ts`
- Create: `apps/backend/src/contact/infra/http/send-contact-email.controller.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/contact/contact-module.ts`
- Create: `apps/backend/src/bootstrap/setup-contact-module.ts`
- Modify: `apps/backend/src/shared/infra/ioc/container.ts` — carregar `contactModule`
- Modify: `apps/backend/src/bootstrap/server-build.ts` — chamar `setupContactModule()`
- Create: `apps/backend/src/contact/infra/http/send-contact-email.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: ao depurar `SHARED_TYPES.Mailer` não injetado, verificar binding em `infraModule` antes de criar contornos
- `typescript-advanced`: tipar `SendContactEmailInput` explicitamente; não usar `any` no body do request
- `security-review`: validar que nenhum dado do formulário é logado ou persistido; o mailer é fire-and-forget
- `super.verification-before-completion`: rodar `pnpm --filter backend tsc:check`, `biome:fix` e `test:business-flow` antes de marcar DONE
- `super.systematic-debugging`: usar ao depurar falha de injeção do `MailerGateway`

## Passos

### Step 1: Criar os tipos IoC do bounded context `contact`

**Crie** `apps/backend/src/contact/infra/ioc/contact-types.ts`:

```typescript
export const CONTACT_TYPES = {
  USE_CASES: {
    SendContactEmail: Symbol.for("CONTACT_TYPES.UseCases.SendContactEmail"),
  },
  CONTROLLERS: {
    SendContactEmail: Symbol.for("CONTACT_TYPES.Controllers.SendContactEmail"),
  },
} as const
```

### Step 2: Escrever o teste de integração (falha primeiro)

**Crie** `apps/backend/src/contact/infra/http/send-contact-email.business-flow-test.ts`:

```typescript
import { describe, expect, test } from "vitest"
import { serverBuild } from "@/bootstrap/server-build.js"

describe("POST /contact", () => {
  test("retorna 200 ao receber payload válido", async () => {
    const server = await serverBuild()

    const response = await server.inject({
      method: "POST",
      url: "/contact",
      payload: {
        nome: "João Silva",
        email: "joao@example.com",
        mensagem: "Tenho uma dúvida sobre os planos.",
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload) as { message: string }
    expect(body.message).toBe("Mensagem enviada com sucesso.")

    await server.close()
  })

  test("retorna 400 quando nome está ausente", async () => {
    const server = await serverBuild()

    const response = await server.inject({
      method: "POST",
      url: "/contact",
      payload: { email: "joao@example.com", mensagem: "Olá." },
    })

    expect(response.statusCode).toBe(400)

    await server.close()
  })

  test("retorna 400 quando e-mail é inválido", async () => {
    const server = await serverBuild()

    const response = await server.inject({
      method: "POST",
      url: "/contact",
      payload: {
        nome: "João",
        email: "nao-e-email",
        mensagem: "Olá.",
      },
    })

    expect(response.statusCode).toBe(400)

    await server.close()
  })
})
```

### Step 3: Rodar o teste e confirmar que falha

```bash
pnpm --filter backend test:business-flow -- --reporter=verbose send-contact-email
```

Esperado: FAIL — rota não existe (404) ou módulo não encontrado.

### Step 4: Criar o use case `SendContactEmailUseCase`

**Crie** `apps/backend/src/contact/application/use-cases/send-contact-email/send-contact-email.use-case.ts`:

```typescript
import { inject, injectable } from "inversify"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

export interface SendContactEmailInput {
  nome: string
  email: string
  mensagem: string
}

@injectable()
export class SendContactEmailUseCase {
  constructor(
    @inject(SHARED_TYPES.Mailer)
    private readonly mailer: MailerGateway,
  ) {}

  public async execute(input: SendContactEmailInput): Promise<void> {
    await this.mailer.sendMail({
      to: "contato@volt.com",
      subject: `Contato de ${input.nome} — VOLT`,
      html: `
        <h2>Nova mensagem de contato</h2>
        <p><strong>Nome:</strong> ${input.nome}</p>
        <p><strong>E-mail:</strong> ${input.email}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${input.mensagem}</p>
      `,
      text: `Nome: ${input.nome}\nE-mail: ${input.email}\nMensagem:\n${input.mensagem}`,
    })
  }
}
```

### Step 5: Criar as constantes de rotas do bounded context

**Crie** `apps/backend/src/contact/infra/http/contact-routes.ts`:

```typescript
export const ContactRoutes = {
  SEND: "/contact",
} as const
```

### Step 6: Criar o controller `SendContactEmailController`

**Crie** `apps/backend/src/contact/infra/http/send-contact-email.controller.ts`:

```typescript
import { inject, injectable } from "inversify"
import type { FastifyRequest } from "fastify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { HttpServer } from "@/shared/infra/server/http-server.js"
import type { SendContactEmailUseCase } from "../../application/use-cases/send-contact-email/send-contact-email.use-case.js"
import { CONTACT_TYPES } from "../ioc/contact-types.js"
import { ContactRoutes } from "./contact-routes.js"

const sendContactEmailSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Informe um e-mail válido."),
  mensagem: z.string().min(1, "Mensagem é obrigatória."),
})

@injectable()
export class SendContactEmailController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(CONTACT_TYPES.USE_CASES.SendContactEmail)
    private readonly sendContactEmail: SendContactEmailUseCase,
  ) {
    super()
    this.bindMethods()
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    await this.server.register(
      "post",
      ContactRoutes.SEND,
      {
        callback: this.callback,
        rateLimit: { max: 10, timeWindow: 60_000 },
      },
    )
  }

  private async callback(req: FastifyRequest) {
    const parsedBodyOrError = this.parseRequest(sendContactEmailSchema, req.body)
    if (parsedBodyOrError.isFailure()) {
      return this.createResponseError(parsedBodyOrError)
    }
    await this.sendContactEmail.execute(parsedBodyOrError.value)
    return { message: "Mensagem enviada com sucesso." }
  }
}
```

### Step 7: Criar o módulo Inversify do bounded context

**Crie** `apps/backend/src/shared/infra/ioc/module/contact/contact-module.ts`:

```typescript
import { ContainerModule } from "inversify"
import { SendContactEmailUseCase } from "@/contact/application/use-cases/send-contact-email/send-contact-email.use-case.js"
import { SendContactEmailController } from "@/contact/infra/http/send-contact-email.controller.js"
import { CONTACT_TYPES } from "@/contact/infra/ioc/contact-types.js"

export const contactModule = new ContainerModule(({ bind }): void => {
  bind(CONTACT_TYPES.USE_CASES.SendContactEmail).to(SendContactEmailUseCase)
  bind(CONTACT_TYPES.CONTROLLERS.SendContactEmail).to(SendContactEmailController)
})
```

### Step 8: Criar a função de setup do módulo

**Crie** `apps/backend/src/bootstrap/setup-contact-module.ts`:

```typescript
import type { SendContactEmailController } from "@/contact/infra/http/send-contact-email.controller.js"
import { CONTACT_TYPES } from "@/contact/infra/ioc/contact-types.js"
import { resolve } from "@/shared/infra/ioc/container.js"

export interface ModuleControllers {
  controllers: { init(): Promise<void> }[]
}

export function setupContactModule(): ModuleControllers {
  const controllers = [
    resolve<SendContactEmailController>(CONTACT_TYPES.CONTROLLERS.SendContactEmail),
  ]
  return { controllers }
}
```

> **Nota:** Se `ModuleControllers` já estiver definido em outro arquivo (ex.: `setup-user-module.ts`), importe-o de lá ao invés de redeclarar.

### Step 9: Carregar o módulo no container

**Leia** `apps/backend/src/shared/infra/ioc/container.ts` e **adicione**:

```typescript
// Adicione o import:
import { contactModule } from "./module/contact/contact-module.js"

// Em container.load(...), adicione contactModule:
container.load(
  // ... módulos existentes ...
  contactModule,
)
```

### Step 10: Inicializar o módulo no bootstrap do servidor

**Leia** `apps/backend/src/bootstrap/server-build.ts` e **adicione** a chamada a `setupContactModule()`:

```typescript
// Adicione o import:
import { setupContactModule } from "./setup-contact-module.js"

// No array de módulos dentro de serverBuild(), adicione:
const modules = [
  // ... módulos existentes ...
  setupContactModule(),
]
```

### Step 11: Rodar o teste e confirmar que passa

```bash
pnpm --filter backend test:business-flow -- --reporter=verbose send-contact-email
```

Esperado: PASS — todos os 3 testes passam.

### Step 12: Verificar lint e tipos

```bash
pnpm --filter backend biome:fix
pnpm --filter backend tsc:check
```

Esperado: zero issues.

### Step 13: Commit

```bash
git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd add \
  apps/backend/src/contact/ \
  apps/backend/src/shared/infra/ioc/module/contact/ \
  apps/backend/src/bootstrap/setup-contact-module.ts \
  apps/backend/src/shared/infra/ioc/container.ts \
  apps/backend/src/bootstrap/server-build.ts

git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd commit -m "feat(contact): adiciona endpoint POST /contact com envio de e-mail via nodemailer"
```

## Critérios de Sucesso

- `POST /contact` com payload válido retorna 200 + `{ message: "Mensagem enviada com sucesso." }` (FR-014)
- `POST /contact` sem `nome` retorna 400 (FR-015)
- `POST /contact` com e-mail inválido retorna 400 (FR-015)
- `pnpm --filter backend biome:fix` passa com zero issues
- `pnpm --filter backend tsc:check` passa sem erros
- `pnpm --filter backend test:business-flow` passa
