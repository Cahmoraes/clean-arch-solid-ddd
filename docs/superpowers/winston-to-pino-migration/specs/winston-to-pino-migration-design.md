---
created_at: "2026-05-11T11:50:28-03:00"
updated_at: "2026-05-11T11:50:28-03:00"
---

# Design: Migração Winston → Pino

## Contexto

O backend utiliza Winston para gerenciamento de logs, encapsulado atrás de uma interface `Logger` e injetado via Inversify IoC. A migração para Pino busca melhor performance, integração nativa com Fastify e saída JSON estruturada em produção.

## Decisões de Design

| Decisão | Escolha |
|---|---|
| Interface `Logger` | Mantida sem alterações |
| Instância Pino | Única instância raiz compartilhada entre `PinoAdapter` e Fastify |
| Transport em desenvolvimento (`NODE_ENV === "test"`) | `pino-pretty` com cores |
| Transport em produção | JSON puro (sem transport overhead) |
| Níveis expostos | Apenas `error`, `warn`, `info` (mantém `LoggerLevels` atual) |
| Child loggers | Interno ao adapter — transparente para os callers |

## Arquitetura

### Fluxo da instância

```
PinoLoggerFactory.create()  →  instância raiz Pino (singleton)
       ├─→  PinoAdapter  (injetado via IoC como SHARED_TYPES.Logger)
       └─→  Fastify({ logger: pinoInstance })
```

Uma única instância garante stream unificado, configuração consistente e `request.log` do Fastify no mesmo formato.

### Arquivos alterados

```
apps/backend/src/shared/infra/logger/
  winston-adapter.ts              ← REMOVIDO
  pino-adapter.ts                 ← NOVO
  pino-logger-factory.ts          ← NOVO
  logger.ts                       ← sem mudança (interface)
  testing-logger.ts               ← sem mudança

apps/backend/src/shared/infra/ioc/module/infra/
  infra-module.ts                 ← atualiza bindings

apps/backend/src/bootstrap/
  setup-fastify.ts (ou similar)   ← passa pinoInstance ao Fastify

apps/backend/package.json         ← adiciona pino + pino-pretty, remove winston
```

## Componentes

### `PinoLoggerFactory`

Responsável por criar e configurar a instância raiz Pino. Usa `isDevelopment()` de `@/shared/infra/env/index.ts` para determinar o transport.

```ts
import pino from 'pino'
import { isDevelopment } from '@/shared/infra/env/index.js'

export function createPinoLogger(): pino.Logger {
  const transport = isDevelopment()
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined

  return pino({ level: 'info', transport })
}
```

| Ambiente | `NODE_ENV` | Transport | Nível |
|---|---|---|---|
| Teste/Dev | `"test"` | `pino-pretty` colorido | `info` |
| Produção | `"production"` | JSON puro | `info` |

### `PinoAdapter`

Implementa a interface `Logger` existente. Recebe a instância Pino via IoC. Internamente extrai `instance.constructor.name` e o passa como campo `module` no objeto de contexto — comportamento equivalente ao Winston atual, porém em JSON estruturado.

```ts
@injectable()
export class PinoAdapter implements Logger {
  constructor(
    @inject(SHARED_TYPES.PinoLogger) private readonly logger: pino.Logger,
  ) {}

  info(instance: object, message: string | object): void {
    this.logger.info(
      { module: this.extractModuleName(instance) },
      this.formatMessage(message),
    )
  }

  warn(instance: object, message: string | object): void {
    this.logger.warn(
      { module: this.extractModuleName(instance) },
      this.formatMessage(message),
    )
  }

  error(instance: object, message: string | object): void {
    this.logger.error(
      { module: this.extractModuleName(instance) },
      this.formatMessage(message),
    )
  }

  private extractModuleName(instance: object): string {
    return instance?.constructor?.name ?? 'Unknown'
  }

  private formatMessage(message: string | object): string {
    return typeof message === 'object' ? JSON.stringify(message) : message
  }
}
```

### IoC — `infra-module.ts`

Dois novos bindings substituem o binding do Winston:

1. `SHARED_TYPES.PinoLogger` → `toConstantValue(createPinoLogger())` — instância raiz singleton
2. `SHARED_TYPES.Logger` → `PinoAdapter` (substitui `WinstonAdapter`)

O símbolo `SHARED_TYPES.PinoLogger` deve ser adicionado em `service-identifier/shared-types.ts`.

### Integração com Fastify

O setup do servidor Fastify deve receber a mesma instância Pino via container:

```ts
const pinoLogger = container.get<pino.Logger>(SHARED_TYPES.PinoLogger)
const app = Fastify({ logger: pinoLogger })
```

## Dependências

| Pacote | Tipo | Ação |
|---|---|---|
| `pino` | `dependencies` | Adicionar |
| `pino-pretty` | `devDependencies` | Adicionar |
| `winston` | `dependencies` | Remover |

## Testes

- **Unitários (`*.test.ts`)**: nenhuma mudança — `TestingLogger` continua implementando `Logger` diretamente.
- **Business-flow (`*.business-flow-test.ts`)**: nenhuma mudança — o binding pode ser sobrescrito via `container.rebindSync()` se necessário.
- **Comportamento esperado nos testes**: logs aparecem com `pino-pretty` (pois `isDevelopment()` retorna `true` quando `NODE_ENV === "test"`).

## Escopo e limites

- **Dentro do escopo**: substituir `WinstonAdapter` por `PinoAdapter`, configurar factory, integrar com Fastify, atualizar IoC, atualizar `package.json`.
- **Fora do escopo**: mudanças na interface `Logger`, adição de child loggers explícitos, redaction de campos sensíveis, log de request body, AsyncLocalStorage para correlationId.
