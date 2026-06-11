# Especificação Técnica — Aprofundamento Arquitetural do Backend

## Resumo Executivo

Esta Tech Spec detalha três refatorações arquiteturais para o `apps/backend`, focadas em concentrar complexidade onde ela gera leverage (módulos profundos) e eliminar indireção rasa. As três frentes são: (1) BaseController — classe abstrata que absorve parsing e error mapping duplicados em 20 controllers, (2) Consolidação de Repository — unificar métodos duplicados em CheckInRepository e GymRepository, e (3) SubscriptionLifecycleService — Domain Service que concentra o acoplamento cross-context (Subscription ↔ User) num único ponto, mantendo transações atômicas.

A estratégia é não-disruptiva: as interfaces públicas HTTP não mudam, os testes business-flow existentes permanecem inalterados, e cada refatoração pode ser feita isoladamente com verificação incremental.

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

**Componentes novos:**

- `BaseController` (`src/shared/infra/controller/base-controller.ts`) — classe abstrata que provê `parseRequest<T>()` e `createResponseError()` como métodos herdáveis. Todos os 20 controllers passam a estendê-la.
- `SubscriptionLifecycleService` (`src/subscription/application/service/subscription-lifecycle.service.ts`) — Domain Service injectable com métodos `activate()`, `cancel()`, `handlePaymentFailed()`. Concentra a orquestração de estado Subscription + User.

**Componentes modificados:**

- `CheckInRepository` interface — métodos `checkInsOfUserId` e `countOfUserId` removidos; `FindManyInput` expandido com `userId?`.
- `GymRepository` interface — `gymOfTitle` e `fetchAll` unificados em `fetchGyms({ title?, page })`.
- `PrismaCheckInRepository`, `InMemoryCheckInRepository` — implementações adaptadas.
- `PrismaGymRepository`, `InMemoryGymRepository` — implementações adaptadas.
- `ActivateSubscriptionUseCase`, `CancelSubscriptionUseCase`, `HandlePaymentFailedUseCase` — delegam ao `SubscriptionLifecycleService`.
- 20 controllers em `user/infra/controller/`, `gym/infra/controller/`, `check-in/infra/controller/`, `session/infra/controller/`, `subscription/infra/controller/` — estendem `BaseController`.

**Relacionamentos:**

```
Controller (herda BaseController)
    → usa parseRequest() para validação Zod
    → usa createResponseError() para mapping de erro
    → chama UseCase.execute()

UseCase (Subscription)
    → delega ao SubscriptionLifecycleService
    → LifecycleService coordena SubscriptionRepository + UserRepository

Repository Interfaces
    → CheckInRepository.findMany({ page, status?, userId? })
    → GymRepository.fetchGyms({ title?, page })
```

---

## Design de Implementação

### Interfaces Principais

```typescript
// src/shared/infra/controller/base-controller.ts
import type { z } from "zod"
import type { Either } from "@/shared/domain/value-object/either"
import type { HandleCallbackResponse } from "@/shared/infra/server/http-server"

export abstract class BaseController implements Controller {
  protected parseRequest<T>(schema: z.ZodType<T>, data: unknown): Either<Error, T>
  protected createResponseError(result: Either<Error, unknown>): HandleCallbackResponse
  abstract init(): Promise<void>
}
```

```typescript
// src/subscription/application/service/subscription-lifecycle.service.ts
export interface SubscriptionLifecycleService {
  activate(input: { billingSubscriptionId: string }, tx?: object): Promise<Either<SubscriptionNotFoundError, null>>
  cancel(input: { billingSubscriptionId: string }, tx?: object): Promise<Either<SubscriptionNotFoundError, null>>
  handlePaymentFailed(input: { customerId: string }, tx?: object): Promise<Either<SubscriptionNotFoundError, null>>
}
```

```typescript
// src/check-in/application/repository/check-in-repository.ts (atualizada)
export interface FindManyInput {
  page: number
  status?: CheckInStatus
  userId?: string
}

export interface CheckInRepository {
  save(checkIn: CheckIn): Promise<SaveResponse>
  checkOfById(id: string): Promise<CheckIn | null>
  onSameDateOfUserId(userId: string, date: Date): Promise<boolean>
  findMany(input: FindManyInput): Promise<FindManyOutput>
  withTransaction<TX extends object>(object: TX): CheckInRepository
}
```

```typescript
// src/gym/application/repository/gym-repository.ts (atualizada)
export interface FetchGymsInput {
  title?: string
  page: number
}

export interface GymRepository {
  save(gym: Gym): Promise<SaveGymResult>
  gymOfId(id: string): Promise<Gym | null>
  gymOfCNPJ(cnpj: string): Promise<Gym | null>
  fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
  fetchGyms(input: FetchGymsInput): Promise<Gym[]>
  withTransaction<TX extends object>(object: TX): GymRepository
}
```

### Modelos de Dados

Nenhuma alteração em modelos de dados ou schema Prisma. As refatorações operam exclusivamente na camada de aplicação e infraestrutura — entidades de domínio permanecem intactas.

### Endpoints de API

Nenhum endpoint novo ou modificado. As interfaces HTTP permanecem idênticas — esta refatoração é interna.

---

## Pontos de Integração

### Inversify IoC Container

**Novo binding necessário:**

- `SUBSCRIPTION_TYPES.SERVICES.Lifecycle` → `SubscriptionLifecycleService` (singleton)
- Registrado em `src/shared/infra/ioc/module/subscription/subscription-container.ts`

**Symbol identifier novo:**

```typescript
// subscription-types.ts
SERVICES: {
  Lifecycle: Symbol.for("SubscriptionLifecycleService"),
}
```

### Tratamento de Transação

O `SubscriptionLifecycleService` recebe o `tx?: object` dos use cases e propaga via `withTransaction()` para ambos os repositories. Comportamento: **rollback atômico completo** — se qualquer persistência falha, ambas as mutações são revertidas (mantendo o comportamento atual do `PrismaUnitOfWork`).

---

## Abordagem de Testes

### Testes Unitários

**BaseController:**
- Testar `parseRequest()` com schemas válidos e inválidos
- Testar `createResponseError()` com diferentes tipos de erro
- Testar herança — controller concreto de teste estendendo BaseController

**SubscriptionLifecycleService:**
- Testar `activate()` — subscription encontrada + user ativado
- Testar `cancel()` — subscription encontrada + user suspenso
- Testar `handlePaymentFailed()` — subscription encontrada + user suspenso
- Testar cenário `SubscriptionNotFoundError`
- Testar cenário user não encontrado (throw Error)
- Mock: InMemorySubscriptionRepository, InMemoryUserRepository

**CheckInRepository consolidação:**
- Testar `findMany({ userId: 'x', page: 1 })` retorna check-ins filtrados
- Testar `findMany({ page: 1, status: 'validated' })` retorna filtrado por status
- Testar `findMany({ page: 1 }).total` retorna contagem correta

**GymRepository consolidação:**
- Testar `fetchGyms({ page: 1 })` retorna todas as academias paginadas
- Testar `fetchGyms({ title: 'CrossFit', page: 1 })` filtra por título

### Testes de Integração (Business-Flow)

**SubscriptionLifecycleService — business flow:**
- Simular webhook Stripe → ActivateSubscription → verificar User ativo
- Simular webhook Stripe → CancelSubscription → verificar User suspenso
- Simular webhook Stripe → HandlePaymentFailed → verificar User suspenso + Subscription past_due

**CheckIn consolidação — business flow:**
- `GET /check-ins?page=1&userId=xxx` retorna check-ins do user com total
- `GET /check-ins/history` continua funcionando (usa findMany internamente)

**Gym consolidação — business flow:**
- `GET /gyms?page=1` retorna todas
- `GET /gyms?title=CrossFit&page=1` filtra por título

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **SubscriptionLifecycleService** — menor blast radius (3 use cases + 1 service novo). Motivo: escopo isolado, validação rápida, não afeta controllers nem repositories de outros contextos.

2. **Consolidação de Repository (CheckIn + Gym)** — blast radius médio (~8 arquivos entre interfaces, implementações e callers). Motivo: depende apenas de si mesmo, callers são poucos e bem identificados.

3. **BaseController** — maior blast radius (20+ controllers). Motivo: faz sentido ser último pois beneficia-se de estabilidade nos outros módulos. Pode ser feito incrementalmente (migrar 3-4 controllers por vez).

### Dependências Técnicas

- Nenhuma dependência de infraestrutura externa
- Nenhum serviço novo a provisionar
- Nenhuma migration de banco necessária
- Inversify IoC precisa apenas de novos bindings (não mudança de versão)

---

## Monitoramento e Observabilidade

Manter o `@Logger` decorator existente nos métodos `init()` dos controllers. Nenhuma métrica adicional necessária — as refatorações são internas e não alteram o comportamento observável do sistema.

O `SubscriptionLifecycleService` herda a visibilidade via logs do Stripe Webhook Worker que já loga cada evento processado.

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa | Alternativa Rejeitada |
|---------|---------------|----------------------|
| BaseController como classe abstrata (não mixin/decorator) | Inversify suporta herança com `@injectable()`. Menor fricção com padrão existente de classes. | Mixin pattern — adicionaria complexidade sem ganho claro dado que todos controllers já são classes |
| Métodos nomeados no LifecycleService (não genérico) | Legibilidade: `lifecycleService.activate()` é mais claro que `lifecycleService.transitionState(lookup, fn)`. Cada método documenta a intenção. | Método genérico `transitionState()` — menor duplicação interna mas interface opaca para callers |
| Consolidar duplicatas sem Criteria pattern | O Criteria pattern (genérico) adicionaria complexidade desproporcional ao benefício. As duplicatas reais são poucas (2 em CheckIn, 2 em Gym). | Full Criteria/Specification — over-engineering para 4 métodos duplicados |
| Manter `withTransaction()` inalterado | Funciona, é testado, e a costura tem 2 adaptadores reais (Prisma + InMemory). Não justifica mudança. | Branded types para transaction — correto mas baixo ROI neste momento |
| Rollback atômico (não eventual consistency) | Simplicidade operacional. Eventos de domínio podem ser adicionados no futuro quando houver requisito real de escalabilidade independente. | Event-driven com eventual consistency — risco desnecessário para o estágio atual |

### Riscos Conhecidos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| BaseController quebra controllers com lógica especial (webhook, cookies) | Baixa | Médio | Controllers especiais podem não estender BaseController, ou sobrescrever todos os métodos |
| `findMany` com `userId?` muda semântica de paginação | Baixa | Baixo | Testes unitários cobrem ambos os cenários (com e sem userId) |
| Inversify inheritance não propagar decorators | Baixa | Alto | Validar com POC em 1 controller antes de migrar todos |

### Conformidade com Skills Padrões

- `no-workarounds` — nenhuma gambiarra; todas as mudanças são root-cause (eliminar duplicação real)
- `test-antipatterns` — testes novos testam através da interface, não da implementação
- `systematic-debugging` — se falhas surgirem, aplicar debugging sistemático
- `tdd` — SubscriptionLifecycleService pode ser escrito test-first
- `vitest` — todos os testes usam Vitest conforme padrão do projeto

### Arquivos Relevantes e Dependentes

**Candidato 1 — BaseController:**
- `src/shared/infra/controller/controller.ts` (interface existente)
- `src/shared/infra/controller/factory/response-factory.ts`
- `src/shared/infra/server/http-server.ts` (tipos)
- 20 controllers em `*/infra/controller/*.controller.ts`

**Candidato 2 — Repository Consolidação:**
- `src/check-in/application/repository/check-in-repository.ts`
- `src/gym/application/repository/gym-repository.ts`
- `src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts`
- `src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`
- `src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.ts`
- `src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`
- `src/check-in/application/use-case/check-in-history.usecase.ts`
- `src/check-in/application/use-case/fetch-check-ins.usecase.ts`
- `src/gym/application/use-case/search-gym.usecase.ts`

**Candidato 5 — SubscriptionLifecycleService:**
- `src/subscription/application/use-case/activate-subscription.usecase.ts`
- `src/subscription/application/use-case/cancel-subscription.usecase.ts`
- `src/subscription/application/use-case/handle-payment-failed.usecase.ts`
- `src/subscription/repository/subscription-repository.ts`
- `src/user/application/persistence/repository/user-repository.ts`
- `src/shared/infra/ioc/module/subscription/subscription-container.ts`
- `src/shared/infra/ioc/module/service-identifier/subscription-types.ts`
- `src/subscription/infra/worker/stripe-webhook-worker.ts`
