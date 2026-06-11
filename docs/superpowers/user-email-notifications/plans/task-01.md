# Task 1: Atualizar interface MailerGateway para suporte a HTML + MailerGatewayMemory com sentEmails [RF-010, RF-011]

**Status:** DONE
**PRD:** `../prd/prd-user-email-notifications.md`
**Spec:** `../specs/user-email-notifications-design.md`

## Visão Geral

A interface `MailerGateway` atual aceita apenas texto puro (`sendMail(to, subject, text)`). Esta task atualiza a interface para aceitar um objeto `SendMailInput` com suporte a HTML, adiciona `sentEmails[]` ao `MailerGatewayMemory` para inspeção em testes, e atualiza o `NodeMailerAdapter` com a nova assinatura.

## Arquivos

- Modify: `apps/backend/src/shared/infra/gateway/mailer-gateway.ts`
- Modify: `apps/backend/src/shared/infra/gateway/mailer-gateway-memory.ts`
- Modify: `apps/backend/src/shared/infra/gateway/node-mailer-adapter.ts`
- Create: `apps/backend/src/shared/infra/gateway/mailer-gateway-memory.test.ts`

### Conformidade com as Skills Padrão

- test-antipatterns: não testar detalhes de implementação internos, apenas o comportamento observável (`sentEmails`)
- no-workarounds: atualizar a interface corretamente em vez de adicionar um segundo método

## Passos

- [ ] **Step 1: Escrever o teste que falha**

Criar o arquivo de teste:

```typescript
// apps/backend/src/shared/infra/gateway/mailer-gateway-memory.test.ts
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { SendMailInput } from "./mailer-gateway"
import { MailerGatewayMemory } from "./mailer-gateway-memory"

describe("MailerGatewayMemory", () => {
  let sut: MailerGatewayMemory

  beforeEach(() => {
    container.snapshot()
    sut = container.get(MailerGatewayMemory)
  })

  afterEach(() => {
    container.restore()
  })

  test("deve armazenar o email enviado em sentEmails", async () => {
    const input: SendMailInput = {
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Test body</p>",
    }

    await sut.sendMail(input)

    expect(sut.sentEmails).toHaveLength(1)
    expect(sut.sentEmails[0].to).toBe("test@example.com")
    expect(sut.sentEmails[0].subject).toBe("Test Subject")
    expect(sut.sentEmails[0].html).toBe("<p>Test body</p>")
  })

  test("deve acumular múltiplos emails em sentEmails", async () => {
    await sut.sendMail({ to: "a@a.com", subject: "A", html: "<p>A</p>" })
    await sut.sendMail({ to: "b@b.com", subject: "B", html: "<p>B</p>" })

    expect(sut.sentEmails).toHaveLength(2)
    expect(sut.sentEmails[1].to).toBe("b@b.com")
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/backend && pnpm test:run -- -t "MailerGatewayMemory"
```

Esperado: FAIL com `TypeError: sut.sentEmails is not iterable` ou `Property 'sentEmails' does not exist`

- [ ] **Step 3: Atualizar a interface `MailerGateway`**

Substituir o conteúdo completo de `apps/backend/src/shared/infra/gateway/mailer-gateway.ts`:

```typescript
export interface SendMailInput {
  to: string
  subject: string
  html: string
  text?: string
}

export interface MailerGateway {
  sendMail(input: SendMailInput): Promise<void>
}
```

- [ ] **Step 4: Atualizar `MailerGatewayMemory`**

Substituir o conteúdo completo de `apps/backend/src/shared/infra/gateway/mailer-gateway-memory.ts`:

```typescript
import { inject, injectable } from "inversify"

import { SHARED_TYPES } from "../ioc/types"
import type { Logger } from "../logger/logger"
import type { MailerGateway, SendMailInput } from "./mailer-gateway"

@injectable()
export class MailerGatewayMemory implements MailerGateway {
  public readonly sentEmails: SendMailInput[] = []

  constructor(
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
  ) {}

  public async sendMail(input: SendMailInput): Promise<void> {
    this.sentEmails.push(input)
    this.logger.info(this, `Sending email to: ${input.to}`)
    this.logger.info(this, `Subject: ${input.subject}`)
  }
}
```

- [ ] **Step 5: Atualizar `NodeMailerAdapter`**

Substituir o conteúdo completo de `apps/backend/src/shared/infra/gateway/node-mailer-adapter.ts`:

```typescript
import { inject, injectable } from "inversify"
import nodemailer, { type Transporter } from "nodemailer"
import { Logger as LoggerDecorate } from "../decorator/logger"
import { SHARED_TYPES } from "../ioc/types"
import type { Logger } from "../logger/logger"
import type { MailerGateway, SendMailInput } from "./mailer-gateway"
import { Retry } from "./retry"

@injectable()
export class NodeMailerAdapter implements MailerGateway {
  private transporter?: Transporter

  constructor(@inject(SHARED_TYPES.Logger) private readonly logger: Logger) {
    this.init()
  }

  @LoggerDecorate({
    message: "✅",
  })
  private async init(): Promise<void> {
    const testAccount = await nodemailer.createTestAccount()
    this.transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
  }

  public async sendMail(input: SendMailInput): Promise<void> {
    console.log("Sending email... *******")
    if (!this.transporter) await this.init()
    if (!this.transporter) throw new Error("Transporter not initialized")
    const mailOptions = {
      from: '"No Reply" <no-reply@test.com>',
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }
    const sendMailWithRetry = Retry.wrap({
      callback: this.transporter.sendMail.bind(this.transporter),
      maxAttempts: 3,
      time: 1000,
    })
    sendMailWithRetry
      .run(mailOptions)
      .then((mailResponse) => {
        this.fireAndForgetSendMail(mailResponse)
      })
      .catch((e) => {
        this.logger.error(this, `Failed to send email: ${e}`)
      })
  }

  private async fireAndForgetSendMail(mailResponse: any): Promise<void> {
    this.logger.info(this, `Email sent ${mailResponse.messageId}`)
    const testMessageURL = nodemailer.getTestMessageUrl(mailResponse)
    this.logger.info(this, `Preview URL: ${testMessageURL}`)
  }
}
```

- [ ] **Step 6: Rodar os testes para confirmar que passam**

```bash
cd apps/backend && pnpm test:run -- -t "MailerGatewayMemory"
```

Esperado: PASS — 2 testes passando

- [ ] **Step 7: Verificar que nenhum teste existente quebrou**

```bash
cd apps/backend && pnpm test:run
```

Esperado: todos os testes anteriores continuam passando

- [ ] **Step 8: Commit**

```bash
cd apps/backend && git add src/shared/infra/gateway/
git commit -m "refactor: update MailerGateway to accept SendMailInput with html support

- Add SendMailInput interface with to, subject, html, text? fields
- Add sentEmails[] to MailerGatewayMemory for test inspection
- Update NodeMailerAdapter to use new interface
- Add MailerGatewayMemory unit tests

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `MailerGateway.sendMail` aceita `SendMailInput` com campo `html`
- `MailerGatewayMemory.sentEmails` acumula todos os emails enviados
- Todos os testes existentes continuam passando (RF-010: falhas não propagam ao usuário final)
