ADR001 — Adotar Turborepo como Orquestrador de Tarefas do Monorepo

- Status: Aceito
- Data: 02/05/2026
- Autor: Time de Arquitetura

---

## Decisão

Adotaremos o **Turborepo** como orquestrador de tarefas do monorepo, em conjunto com o pnpm
workspaces, para gerenciar o pipeline de `build`, `test`, `lint`, `dev` e `generate:types` com
caching incremental e execução paralela entre workspaces.

## Contexto

O repositório era composto exclusivamente por um backend (Clean Architecture + DDD com Fastify).
A necessidade de adicionar um frontend Next.js ao mesmo repositório exigiu a adoção de uma
estratégia de monorepo. O pnpm workspaces já era utilizado como gerenciador de pacotes — a
questão central foi qual ferramenta adicionar para orquestrar tarefas entre múltiplos workspaces.

Critérios de decisão:
- Simplicidade de configuração (prioridade máxima)
- Caching incremental de builds e testes para evitar retrabalho
- Execução paralela de tasks independentes
- Integração nativa com pnpm workspaces
- Escalabilidade para adicionar mais apps no futuro sem refatoração estrutural

## Opções Consideradas

- **Opção 1 — pnpm workspaces puro** (sem orquestrador)
  - Prós: zero dependências novas; configuração mínima; já conhecido pelo time
  - Contras: sem caching incremental; scripts `pnpm -r run build` não gerenciam dependências entre workspaces; pode ficar lento ao crescer

- **Opção 2 — pnpm workspaces + Turborepo** *(SELECIONADA)*
  - Prós: caching local de builds e testes; execução paralela automática; `turbo.json` declarativo e simples; migração futura para cache remoto (Vercel Remote Cache) é trivial; integração nativa com pnpm
  - Contras: dependência adicional (`turbo`); um arquivo de configuração extra (`turbo.json`)

- **Opção 3 — pnpm workspaces + Nx**
  - Prós: muito poderoso; geradores de código; grafo de dependências visual; cache remoto nativo
  - Contras: curva de aprendizado alta; configuração extensiva; overhead excessivo para apenas 2 apps; filosofia "opinionated" conflita com o backend já estruturado

## Consequências

- ✅ Positivo: `pnpm build` na raiz constrói apenas o que mudou, reduzindo tempo de CI
- ✅ Positivo: dependências de build entre workspaces são declaradas explicitamente em `turbo.json` via `"dependsOn": ["^build"]`
- ✅ Positivo: adicionar novos apps ou pacotes no futuro requer apenas declarar o workspace — sem reconfigurar o pipeline
- ✅ Positivo: `pnpm dev` sobe backend e frontend em paralelo com um único comando
- ❌ Negativo: caching remoto (Vercel Remote Cache) fora do escopo desta entrega; CI ainda não aproveita cache entre execuções
- ❌ Negativo: nova dependência a manter (`turbo`)

## Recomendações

- Sessão de design arquitetural (02/05/2026) — três opções avaliadas; Turborepo escolhido pelo equilíbrio entre simplicidade e capacidade de caching
