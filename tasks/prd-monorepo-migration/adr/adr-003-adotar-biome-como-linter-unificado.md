ADR003 — Adotar Biome como Linter e Formatter Unificado em Todos os Workspaces

- Status: Aceito
- Data: 02/05/2026
- Autor: Time de Arquitetura

---

## Decisão

Adotaremos o **Biome** como ferramenta unificada de linting e formatação em todos os workspaces
do monorepo (`apps/backend/` e `apps/frontend/`), em vez de usar ESLint no frontend (padrão
gerado pelo `create-next-app`).

## Contexto

O backend já utilizava Biome (`@biomejs/biome` v2.4.13) para linting e formatação, substituindo
ESLint e Prettier. Ao adicionar o workspace `apps/frontend/`, o `create-next-app` instala ESLint
por padrão. A questão foi se o frontend deveria seguir o padrão Next.js (ESLint) ou unificar com
o backend (Biome).

Biome é uma ferramenta all-in-one escrita em Rust que combina linter, formatter e organizador de
imports com performance significativamente superior ao ESLint + Prettier. O backend já demonstrou
funcionamento correto com a configuração atual (`biome.json`).

## Opções Consideradas

- **Opção 1 — ESLint no frontend** (padrão `create-next-app`)
  - Prós: zero configuração adicional; suporte oficial do time Next.js; plugin `eslint-config-next` com regras específicas para Next.js
  - Contras: cria duas ferramentas de linting no mesmo monorepo (Biome no backend, ESLint no frontend); `pnpm lint` na raiz executaria ferramentas diferentes; configuração duplicada e divergente entre workspaces; ESLint + Prettier são significativamente mais lentos que Biome

- **Opção 2 — Biome em todos os workspaces** *(SELECIONADA)*
  - Prós: tooling unificado no monorepo inteiro; `pnpm lint` executa a mesma ferramenta em todos os workspaces via Turborepo; compartilhamento de regras via `biome.json` por workspace; performance superior (Rust vs. Node.js); sem necessidade de manter Prettier separado
  - Contras: Biome não possui plugin específico para regras Next.js (como `next/no-html-link-for-pages`); versão atual (2.4.13) pode não cobrir todos os casos de lint do ecossistema React/Next.js

## Consequências

- ✅ Positivo: `pnpm lint` na raiz executa o mesmo binário em todos os workspaces — resultado consistente e previsível
- ✅ Positivo: elimina conflito entre regras Prettier e ESLint (problema clássico em projetos que usam ambos)
- ✅ Positivo: performance de lint e formatação muito superior (Biome é ~10-100x mais rápido que ESLint)
- ✅ Positivo: sem dependências de `eslint`, `eslint-config-next`, `prettier` no workspace frontend
- ❌ Negativo: ausência de regras específicas para Next.js (ex: `@next/next/no-img-element`) — equipe deve compensar via revisão manual ou migrar para ESLint se a cobertura se tornar problema
- ❌ Negativo: `biome.json` precisa ser mantido por workspace (sem herança de config de nível raiz na versão atual)

## Recomendações

- Tech Spec de migração para monorepo (02/05/2026) — Biome escolhido durante esclarecimentos técnicos para unificar tooling; custo de ausência de regras Next.js-específicas considerado aceitável neste estágio
