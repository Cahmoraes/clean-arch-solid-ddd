# ADR001 — Manter UserQuery e example-worker como Material de Estudo Intencional

- Status: Aceito
- Data: 01/06/2026
- Autor: Caique

---

## Decisão

Manteremos o Builder `UserQuery` (`src/user/application/persistence/repository/user-query.ts` + método `UserRepository.get()`) e o módulo `src/example-worker/` no codebase, mesmo tendo baixa utilização (1 caller) e nenhuma utilização, respectivamente. Ambos são material de estudo intencional — este é um repositório de aprendizado de padrões (Clean Architecture, SOLID, DDD).

## Contexto

Uma análise arquitetural (revisão de deepening opportunities, 01/06/2026) identificou ambos como candidatos à remoção:

- **`UserQuery` (Builder pattern)**: usado por apenas 1 caller (`create-user.usecase.ts`), onde `userOfEmail()` seria suficiente. Pelo critério de "seam hipotético" (interface com complexidade que não varia), seria removível.
- **`src/example-worker/`**: 145 linhas demonstrando `worker_threads` com bcrypt, sem nenhuma referência em código de produção, scripts ou `package.json`.

A regra usada na análise — métodos/módulos sem callers são código morto — é correta para codebases de produção, mas este repositório tem objetivo duplo: aplicação funcional **e** catálogo de padrões para estudo.

## Opções Consideradas

- **Opção 1 (SELECIONADA) — Manter como material de estudo**
  - Prós: preserva demonstrações didáticas de Builder pattern e worker_threads; alinhado ao propósito do repositório
  - Contras: análises automáticas de código morto continuarão sinalizando ambos (mitigado por este ADR)

- **Opção 2 — Remover ambos**
  - Prós: codebase menor, sem código sem callers
  - Contras: perde os exemplos didáticos; o propósito de estudo do repositório seria prejudicado

## Consequências

- Positivo: futuras análises arquiteturais devem **pular** `UserQuery` e `example-worker` como candidatos à remoção
- Negativo: ferramentas de análise de código morto (knip, ts-prune, etc.) precisarão de allowlist para esses módulos
- Neutro: se `UserQuery` ganhar mais callers no futuro (queries dinâmicas), esta decisão se torna irrelevante
