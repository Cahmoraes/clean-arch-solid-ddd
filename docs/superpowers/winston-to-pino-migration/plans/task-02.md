# Task 2: Criar PinoLoggerFactory

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/winston-to-pino-migration-design.md`

## Visão Geral

Criar a factory `createPinoLogger()` que instancia e configura o logger Pino raiz. Em desenvolvimento (`NODE_ENV === "test"`), usa `pino-pretty` com colorização. Em produção, gera JSON puro. A instância criada é um singleton que será compartilhada entre o `PinoAdapter` e o `FastifyAdapter`.

## Arquivos

- Create: `apps/backend/src/shared/infra/logger/pino-logger-factory.ts`
- Create: `apps/backend/src/shared/infra/logger/pino-logger-factory.test.ts`

## Passos

- [ ] **Step 1: Escrever o teste com falha**

Criar `apps/backend/src/shared/infra/logger/pino-logger-factory.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { createPinoLogger } from "./pino-logger-factory.js"

describe("createPinoLogger", () => {
  it("should return a pino logger instance", () => {
    const logger = createPinoLogger()
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe("function")
    expect(typeof logger.warn).toBe("function")
    expect(typeof logger.error).toBe("function")
  })

  it("should create logger with level info", () => {
    const logger = createPinoLogger()
    expect(logger.level).toBe("info")
  })
})
```

- [ ] **Step 2: Executar o teste para confirmar falha**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
pnpm --filter backend test:run -- -t "createPinoLogger"
```

Esperado: erro de módulo não encontrado (`Cannot find module './pino-logger-factory.js'`).

- [ ] **Step 3: Implementar `pino-logger-factory.ts`**

Criar `apps/backend/src/shared/infra/logger/pino-logger-factory.ts`:

```typescript
import pino from "pino"
import { isDevelopment } from "../env/index.js"

export function createPinoLogger(): pino.Logger {
  const transport = isDevelopment()
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      }
    : undefined

  return pino({ level: "info", transport })
}
```

- [ ] **Step 4: Executar o teste para confirmar aprovação**

```bash
pnpm --filter backend test:run -- -t "createPinoLogger"
```

Esperado:
```
✓ should return a pino logger instance
✓ should create logger with level info
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/shared/infra/logger/pino-logger-factory.ts \
        apps/backend/src/shared/infra/logger/pino-logger-factory.test.ts
git commit -m "feat(backend): add PinoLoggerFactory
```

## Critérios de Sucesso

- `createPinoLogger()` retorna uma instância pino com `level === 'info'`
- Em ambiente de teste (`isDevelopment() === true`), configura transport `pino-pretty`
- Em produção, nenhum transport (JSON puro)
- Testes passam com 100%
