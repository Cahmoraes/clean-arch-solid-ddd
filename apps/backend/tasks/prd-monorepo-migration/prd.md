# Template de Documento de Requisitos de Produto (PRD)

## Visão Geral

O projeto atualmente é composto apenas por um backend (Clean Architecture + DDD) que expõe uma API
REST para gerenciar usuários, academias, check-ins e assinaturas via Stripe. A necessidade de
adicionar uma interface web exige que backend e frontend coexistam em um único repositório com
fluxo de desenvolvimento unificado.

Esta funcionalidade converte o repositório em um monorepo com dois apps (`backend/` e `frontend/`)
e um pacote interno de tipos compartilhados (`packages/api-types`), gerenciado por pnpm workspaces
e orquestrado pelo Turborepo.

## Objetivos

- Backend e frontend convivem no mesmo repositório com scripts unificados de `dev`, `build` e `test`
- Tipos TypeScript gerados pelo backend a partir do OpenAPI são consumidos pelo frontend sem cópia
  manual, via pacote interno `@repo/api-types`
- Um único comando na raiz do repositório executa build ou testes de todos os workspaces
- A estrutura permite adicionar novos apps ou pacotes no futuro sem refatoração estrutural

## Histórias de Usuário

- Como desenvolvedor do time, quero rodar `pnpm dev` na raiz e subir backend e frontend
  simultaneamente, para não precisar abrir dois terminais ou dois repositórios
- Como desenvolvedor do time, quero que mudanças no contrato de API do backend sejam refletidas
  automaticamente nos tipos do frontend após uma regenaração, para eliminar erros de integração
  silenciosos
- Como desenvolvedor do time, quero rodar `pnpm test` na raiz e executar os testes de todos os
  workspaces, para ter uma visão unificada de saúde do projeto

## Funcionalidades Principais

### 1. Estrutura de Monorepo

Reorganização do repositório na estrutura:

```
raiz/
├── backend/   — código atual do backend
├── frontend/  — novo app Next.js
└── packages/
    └── api-types/  — tipos OpenAPI compartilhados
```

**Requisitos funcionais:**

- RF-01: O código backend existente deve ser movido para `backend/` preservando todo o histórico
  git e configurações atuais (prisma, testes, biome, tsconfig)
- RF-02: Um app Next.js deve ser criado em `frontend/` com TypeScript e TanStack Query
- RF-03: Um pacote interno `packages/api-types` deve ser criado e exportado como `@repo/api-types`

### 2. Orquestração com Turborepo

Pipeline centralizado na raiz que coordena tarefas entre workspaces com caching incremental.

**Requisitos funcionais:**

- RF-04: `pnpm dev` na raiz deve iniciar backend e frontend em paralelo
- RF-05: `pnpm build` na raiz deve construir os workspaces na ordem correta (`api-types` →
  `backend` → `frontend`), aproveitando cache do Turborepo quando não houver mudanças
- RF-06: `pnpm test` na raiz deve executar os testes de todos os workspaces
- RF-07: `pnpm lint` na raiz deve executar lint em todos os workspaces

### 3. Tipos Compartilhados via OpenAPI

O backend já gera `docs/openapi-spec.json` e `api-types.d.ts`. O pacote `@repo/api-types` deve
ser o ponto único de distribuição desses tipos para o frontend.

**Requisitos funcionais:**

- RF-08: O script de geração do backend deve escrever o `api-types.d.ts` em
  `packages/api-types/index.d.ts`
- RF-09: O frontend deve importar tipos de `@repo/api-types` sem referências de caminho relativo
  para fora do seu workspace
- RF-10: A regeneração dos tipos deve ser possível com um único comando sem intervenção manual de
  cópia de arquivos

## Experiência do Usuário

**Persona primária**: desenvolvedor do time trabalhando em features que cruzam backend e frontend.

**Fluxo principal de desenvolvimento:**

1. Desenvolvedor clona o repositório e roda `pnpm install` na raiz
2. Roda `pnpm dev` e ambos os apps sobem
3. Modifica uma rota no backend e regenera os tipos com um único comando
4. O frontend já recebe os tipos atualizados via `@repo/api-types`
5. Roda `pnpm test` para validar ambos os apps

**Requisitos de experiência:**

- Tempo de setup (clone → dev rodando) deve ser equivalente ao setup atual do backend sozinho
- Nenhum passo manual de sincronização de tipos entre apps

## Restrições Técnicas de Alto Nível

- O gerenciador de pacotes é pnpm (já em uso); a solução deve usar pnpm workspaces
- O orquestrador de monorepo é Turborepo
- O frontend usa Next.js 15 com App Router, TypeScript e TanStack Query
- O HTTP client do frontend usa `openapi-fetch` integrado com `@repo/api-types`
- O backend não pode ter nenhuma dependência de runtime do frontend ou de `packages/`
- Todos os testes existentes do backend devem continuar passando após a migração

## Fora de Escopo

- Configuração de CI/CD (pipelines de integração contínua e entrega)
- Deploy do frontend (Vercel, containers, etc.)
- Configuração do design system (tokens, componentes de UI)
- Implementação de telas ou features do frontend
- Autenticação no frontend (estratégia de cookies/session JWT)
- Caching remoto do Turborepo (Vercel Remote Cache ou similar)
