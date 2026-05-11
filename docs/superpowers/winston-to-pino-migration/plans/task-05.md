# Task 5: Integrar Pino no FastifyAdapter

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/winston-to-pino-migration-design.md`

## Visão Geral

Injetar a instância raiz Pino (`SHARED_TYPES.PinoLogger`) no `FastifyAdapter` e passá-la ao construtor do Fastify (`fastify({ logger: pinoInstance })`). Isso habilita o request logging nativo do Fastify via `request.log`, usando o mesmo stream e formato configurados para toda a aplicação.

## Arquivos

- Modify: `apps/backend/src/shared/infra/server/fastify-adapter.ts`

## Passos

- [ ] **Step 1: Adicionar o import do tipo `pino` em `fastify-adapter.ts`**

No topo do arquivo `apps/backend/src/shared/infra/server/fastify-adapter.ts`, adicionar o import do tipo Pino:

```typescript
import type pino from "pino"
```

- [ ] **Step 2: Injetar `SHARED_TYPES.PinoLogger` no construtor**

Localizar o construtor do `FastifyAdapter`. Ele atualmente tem três parâmetros injetados. Adicionar o quarto:

```typescript
// Antes:
constructor(
  @inject(SHARED_TYPES.Tokens.Auth)
  private readonly authToken: AuthToken,
  @inject(SHARED_TYPES.Logger)
  private readonly logger: Logger,
  @inject(SHARED_TYPES.Queue)
  private readonly queue: Queue,
) {
  this._server = fastify({
    ajv: {
      customOptions: {
        keywords: ["example"],
      },
    },
  })
  // ...
}

// Depois:
constructor(
  @inject(SHARED_TYPES.Tokens.Auth)
  private readonly authToken: AuthToken,
  @inject(SHARED_TYPES.Logger)
  private readonly logger: Logger,
  @inject(SHARED_TYPES.Queue)
  private readonly queue: Queue,
  @inject(SHARED_TYPES.PinoLogger)
  private readonly pinoLogger: pino.Logger,
) {
  this._server = fastify({
    logger: this.pinoLogger,
    ajv: {
      customOptions: {
        keywords: ["example"],
      },
    },
  })
  // ...
}
```

> **Nota:** O campo `private readonly pinoLogger` pode ser declarado apenas no parâmetro do construtor (sem campo separado) se preferir. A forma acima mantém consistência com o padrão do arquivo.

- [ ] **Step 3: Verificar type-check**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
pnpm --filter backend tsc:check
```

Neste ponto os únicos erros esperados devem ser relativos ao `WinstonAdapter` ainda existindo (será removido na Task 6). Erros em outros arquivos devem ser investigados e corrigidos antes de prosseguir.

- [ ] **Step 4: Executar os testes unitários e de integração**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passando.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/shared/infra/server/fastify-adapter.ts
git commit -m "feat(backend): integrate pino instance into FastifyAdapter for native request logging

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `FastifyAdapter` recebe `pino.Logger` via IoC (`SHARED_TYPES.PinoLogger`)
- `fastify({ logger: pinoLogger })` habilitando request logging nativo (`request.log`)
- Testes passando
