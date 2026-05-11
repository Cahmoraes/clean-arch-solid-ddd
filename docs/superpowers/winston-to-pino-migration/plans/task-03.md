# Task 3: Criar PinoAdapter

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/winston-to-pino-migration-design.md`

## Visão Geral

Criar `PinoAdapter` que implementa a interface `Logger` existente (`error`, `warn`, `info`). Recebe a instância Pino via IoC. Internamente extrai `instance.constructor.name` e passa como campo `module` no objeto de contexto do Pino. Mensagens do tipo `object` são serializadas como JSON.

## Arquivos

- Create: `apps/backend/src/shared/infra/logger/pino-adapter.ts`
- Create: `apps/backend/src/shared/infra/logger/pino-adapter.test.ts`

## Passos

- [ ] **Step 1: Escrever os testes com falha**

Criar `apps/backend/src/shared/infra/logger/pino-adapter.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest"
import { PinoAdapter } from "./pino-adapter.js"
import type pino from "pino"

function makeMockPinoLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as pino.Logger
}

describe("PinoAdapter", () => {
  describe("info", () => {
    it("should call pino.info with module name and string message", () => {
      const mockLogger = makeMockPinoLogger()
      const adapter = new PinoAdapter(mockLogger)
      class MyService {}
      const instance = new MyService()

      adapter.info(instance, "hello world")

      expect(mockLogger.info).toHaveBeenCalledWith(
        { module: "MyService" },
        "hello world",
      )
    })

    it("should serialize object messages as JSON", () => {
      const mockLogger = makeMockPinoLogger()
      const adapter = new PinoAdapter(mockLogger)
      const instance = { constructor: { name: "SomeClass" } }

      adapter.info(instance, { key: "value", count: 1 })

      expect(mockLogger.info).toHaveBeenCalledWith(
        { module: "SomeClass" },
        '{"key":"value","count":1}',
      )
    })

    it("should fallback to Unknown when constructor name is unavailable", () => {
      const mockLogger = makeMockPinoLogger()
      const adapter = new PinoAdapter(mockLogger)
      const instance = Object.create(null) as object

      adapter.info(instance, "message")

      expect(mockLogger.info).toHaveBeenCalledWith(
        { module: "Unknown" },
        "message",
      )
    })
  })

  describe("warn", () => {
    it("should call pino.warn with module name and message", () => {
      const mockLogger = makeMockPinoLogger()
      const adapter = new PinoAdapter(mockLogger)
      class MyController {}
      const instance = new MyController()

      adapter.warn(instance, "something is off")

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { module: "MyController" },
        "something is off",
      )
    })
  })

  describe("error", () => {
    it("should call pino.error with module name and message", () => {
      const mockLogger = makeMockPinoLogger()
      const adapter = new PinoAdapter(mockLogger)
      class MyUseCase {}
      const instance = new MyUseCase()

      adapter.error(instance, "something broke")

      expect(mockLogger.error).toHaveBeenCalledWith(
        { module: "MyUseCase" },
        "something broke",
      )
    })
  })
})
```

- [ ] **Step 2: Executar os testes para confirmar falha**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
pnpm --filter backend test:run -- -t "PinoAdapter"
```

Esperado: erro de módulo não encontrado (`Cannot find module './pino-adapter.js'`).

- [ ] **Step 3: Implementar `pino-adapter.ts`**

Criar `apps/backend/src/shared/infra/logger/pino-adapter.ts`:

```typescript
import { inject, injectable } from "inversify"
import type pino from "pino"
import { SHARED_TYPES } from "../ioc/types.js"
import type { Logger } from "./logger.js"

@injectable()
export class PinoAdapter implements Logger {
  constructor(
    @inject(SHARED_TYPES.PinoLogger)
    private readonly logger: pino.Logger,
  ) {}

  public info(instance: object, message: string | object): void {
    this.logger.info(
      { module: this.extractModuleName(instance) },
      this.formatMessage(message),
    )
  }

  public warn(instance: object, message: string | object): void {
    this.logger.warn(
      { module: this.extractModuleName(instance) },
      this.formatMessage(message),
    )
  }

  public error(instance: object, message: string | object): void {
    this.logger.error(
      { module: this.extractModuleName(instance) },
      this.formatMessage(message),
    )
  }

  private extractModuleName(instance: object): string {
    return (instance as { constructor?: { name?: string } })?.constructor
      ?.name ?? "Unknown"
  }

  private formatMessage(message: string | object): string {
    return typeof message === "object" ? JSON.stringify(message) : message
  }
}
```

> **Nota:** O símbolo `SHARED_TYPES.PinoLogger` será adicionado na Task 4. Neste momento o TypeScript acusará erro de tipo; será resolvido na Task 4.

- [ ] **Step 4: Executar os testes para confirmar aprovação**

```bash
pnpm --filter backend test:run -- -t "PinoAdapter"
```

Esperado:
```
✓ should call pino.info with module name and string message
✓ should serialize object messages as JSON
✓ should fallback to Unknown when constructor name is unavailable
✓ should call pino.warn with module name and message
✓ should call pino.error with module name and message
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/shared/infra/logger/pino-adapter.ts \
        apps/backend/src/shared/infra/logger/pino-adapter.test.ts
git commit -m "feat(backend): add PinoAdapter implementing Logger interface

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `PinoAdapter` implementa corretamente a interface `Logger`
- Extrai `constructor.name` do `instance` e passa como `module` no contexto Pino
- Serializa mensagens objeto como JSON
- Fallback para `"Unknown"` quando `constructor.name` não está disponível
- Todos os testes passam
