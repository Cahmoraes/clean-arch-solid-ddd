# Architectural Analysis Report

**Projeto:** apps/frontend
**Data:** 2026-05-02
**Escopo:** Analise arquitetural completa do frontend Next.js

---

## 1 -- Executive Summary

O frontend e uma aplicacao **Next.js 16** com **App Router**, construida sobre **React 19** e estilizada com **Tailwind CSS 4** seguindo um design system monocromatico inspirado no Ollama. A aplicacao consome uma API REST backend via **openapi-fetch** com tipos gerados automaticamente pelo pacote compartilhado `@repo/api-types`.

**Stack tecnologico principal:**
- Next.js 16 (App Router, React Server Components)
- React 19, TypeScript 5 (strict mode)
- TanStack Query 5 (server state), Zustand 5 (client state)
- Tailwind CSS 4, shadcn/ui (Radix primitives), CVA
- Zod 4 + React Hook Form 7 (validacao de formularios)
- Vitest 4 + Testing Library + MSW 2 (teste de unidade)
- Playwright 1.59 (testes E2E)
- Biome 2.4 (lint/format)

**Padroes arquiteturais identificados:**
- Feature-based modular architecture (modulos de dominio em `features/`)
- Route group layout pattern (Next.js `(authenticated)` / `(public)`)
- Custom hooks pattern para server state (TanStack Query)
- Middleware de autenticacao em edge runtime (Next.js middleware)
- Proactive token refresh com replay automatico de requisicoes 401
- OpenAPI-first API client com tipos compartilhados
- MSW (Mock Service Worker) para isolamento de testes

**Principais achados arquiteturais:**
- Separacao clara de rotas publicas e autenticadas via route groups e edge middleware
- Cada feature module segue estrutura consistente: `api/`, `components/`, `schemas/`
- Sistema de autenticacao robusto com refresh proativo, cookie httpOnly e replay de 401
- Infraestrutura de testes abrangente com MSW, helpers de provisioning e testes de acessibilidade WCAG
- Duplicacao da funcao `toApiError()` em 6 modulos de feature (debito tecnico identificado)
- 3 arquivos de componentes mortos identificados (dialog.tsx, tabs.tsx, auth/schemas.ts)

**Avaliacao geral:** Arquitetura bem estruturada com separacao de responsabilidades clara, padroes consistentes entre features, e boa cobertura de testes. O debito tecnico e localizado e gerenciavel.

---

## 2 -- System Overview

### Bounded Contexts e Subdominios (DDD)

Embora este seja um frontend SPA, os modulos de feature refletem bounded contexts alinhados com o backend:

- **Authentication (Core):** Login, signup, ativacao de conta, troca de senha, sessao JWT
- **Gyms (Core):** Busca, listagem e criacao de academias
- **Check-Ins (Core):** Criacao e listagem de check-ins, validacao administrativa
- **Profile (Supporting):** Visualizacao de perfil proprio e publico, metricas
- **Subscriptions (Supporting):** Criacao de assinaturas (fluxo demo)
- **Admin (Supporting):** Gestao de usuarios, validacao de check-ins, criacao de academias

### Estrutura de Diretorios

```
apps/frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (Providers + Toaster + WebVitals)
│   │   ├── providers.tsx             # QueryClientProvider + AuthProvider
│   │   ├── web-vitals.tsx            # Web Vitals reporter
│   │   ├── globals.css               # Design tokens Tailwind (monocromatico)
│   │   ├── (public)/                 # Rotas publicas (login, cadastro, ativar, landing)
│   │   │   ├── layout.tsx            # PublicShell wrapper
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── login/page.tsx        # Login
│   │   │   ├── cadastro/page.tsx     # Signup
│   │   │   └── ativar/[token]/page.tsx # Ativacao de conta
│   │   └── (authenticated)/          # Rotas protegidas
│   │       ├── layout.tsx            # AuthenticatedShell wrapper
│   │       ├── academias/            # Busca e detalhes de academias
│   │       ├── check-ins/            # Listagem de check-ins
│   │       ├── perfil/               # Perfil e troca de senha
│   │       ├── assinatura/           # Pagina de assinatura
│   │       └── admin/                # Painel admin (usuarios, check-ins, nova academia)
│   │           └── layout.tsx        # AdminGuard wrapper
│   ├── components/
│   │   ├── ui/                       # Componentes base (Button, Input, Dialog, etc.)
│   │   └── layout/                   # Shells de layout (PublicShell, AuthenticatedShell, AdminGuard)
│   ├── features/                     # Modulos de dominio
│   │   ├── auth/                     # Autenticacao
│   │   │   ├── api/                  # Hooks de mutacao (login, signup, logout, etc.)
│   │   │   └── schemas/              # Schemas Zod (login, signup, activate, changePassword)
│   │   ├── gyms/                     # Academias
│   │   │   ├── api/                  # Hooks de query/mutacao + extended paths
│   │   │   ├── components/           # GymCard, GymPagination, GymResults
│   │   │   └── schemas/              # createGymSchema
│   │   ├── check-ins/                # Check-ins
│   │   │   ├── api/                  # Hooks + extended paths
│   │   │   └── components/           # CheckInItem
│   │   ├── profile/                  # Perfil
│   │   │   ├── api/                  # useMe, useMetrics, useUserById
│   │   │   ├── components/           # (nao encontrado no inventario)
│   │   │   └── schemas/              # updateProfileSchema
│   │   ├── subscriptions/            # Assinaturas
│   │   │   ├── api/                  # useCreateSubscription
│   │   │   └── schemas/              # createSubscriptionSchema, DEMO_PLANS
│   │   └── admin/                    # Administracao
│   │       ├── api/                  # useUsers
│   │       └── components/           # UserRow
│   ├── lib/                          # Utilitarios e infraestrutura compartilhada
│   │   ├── api.ts                    # Cliente OpenAPI singleton com middleware chain
│   │   ├── auth/                     # Auth store, token refresh, fetch middleware
│   │   ├── cn.ts                     # Class merge utility (clsx + tailwind-merge)
│   │   ├── errors.ts                 # ApiError class + status mapping
│   │   ├── jwt.ts                    # JWT decode (sem verificacao criptografica)
│   │   ├── observability.ts          # Logger + Web Vitals sink
│   │   └── query-client.ts           # TanStack Query client config
│   ├── middleware.ts                  # Edge middleware (protecao de rotas)
│   └── test/                         # Infraestrutura de testes
│       ├── setup.ts                  # Setup global (MSW, cleanup, reset)
│       ├── render.tsx                # renderWithProviders + makeTestJwt
│       └── msw/                      # Mock Service Worker (handlers, server, browser)
├── e2e/                              # Testes E2E Playwright
│   ├── helpers/                      # Provisioning e seeding (auth.ts, seed.ts)
│   ├── smoke.spec.ts                 # Smoke test basico
│   ├── onboarding.spec.ts            # Fluxo completo signup -> login -> busca
│   ├── session-refresh.spec.ts       # Renovacao transparente de token
│   ├── admin-validate-checkin.spec.ts # Validacao admin de check-in
│   └── accessibility.spec.ts         # Conformidade WCAG (axe-core)
├── package.json
├── tsconfig.json
├── biome.json
├── vitest.config.ts
├── playwright.config.ts
├── next.config.ts
├── AGENTS.md
└── DESIGN.md
```

### Metricas de Tamanho

| Metrica | Valor |
| --- | --- |
| Total de arquivos TypeScript/TSX | 111 |
| Arquivos de producao (excluindo testes) | 68 |
| Arquivos de teste (.test.ts/.tsx) | 43 |
| Linhas de codigo total (src/) | ~9.095 |
| Linhas de codigo das features | ~2.196 |
| Linhas de codigo E2E (specs + helpers) | ~525 |

---

## 3 -- Critical Components Analysis

**Acoplamento Aferente (Ca)** mede quantos componentes externos dependem de um dado componente (dependencias de entrada). Um valor alto de Ca indica que o componente e amplamente utilizado por todo o sistema e que mudancas nele geram alto impacto.

**Acoplamento Eferente (Ce)** mede quantos componentes externos um dado componente consome (dependencias de saida). Um valor alto de Ce indica um componente fragil que depende de muitas partes externas, tornando-o sensivel a mudancas e dificil de reutilizar isoladamente.

**Instabilidade (I = Ce / (Ca + Ce))** varia de 0 (completamente estavel, dificil de mudar) a 1 (completamente instavel, facil de mudar mas vulneravel a mudancas externas).

| Component | Type | Location | Afferent Coupling (Ca) | Efferent Coupling (Ce) | Instability (I) | Architectural Role |
| --- | --- | --- | --- | --- | --- | --- |
| api.ts | Infrastructure | src/lib/api.ts | 9 | 5 | 0.36 | Cliente OpenAPI singleton, middleware chain, ponto central de comunicacao com backend |
| auth-store.ts | State Management | src/lib/auth/auth-store.ts | 14 | 1 | 0.07 | Estado global de autenticacao (Zustand), cookie de sessao, event bus |
| errors.ts | Utility | src/lib/errors.ts | 17 | 0 | 0.00 | ApiError class e mapeamento HTTP status -> mensagem legivel |
| cn.ts | Utility | src/lib/cn.ts | 13 | 2 | 0.13 | Merge de classes Tailwind CSS (clsx + tailwind-merge) |
| token-refresh.ts | Infrastructure | src/lib/auth/token-refresh.ts | 3 | 1 | 0.25 | Scheduler de refresh proativo (60s antes do expiry), dedup de chamadas |
| auth-fetch-middleware.ts | Infrastructure | src/lib/auth/auth-fetch-middleware.ts | 1 | 2 | 0.67 | Middleware fetch: injeta Bearer, trata 401 com refresh + replay |
| jwt.ts | Utility | src/lib/jwt.ts | 1 | 0 | 0.00 | Decode JWT sem verificacao criptografica |
| observability.ts | Infrastructure | src/lib/observability.ts | 3 | 0 | 0.00 | Logger com niveis filtraveis e sink de Web Vitals |
| query-client.ts | Infrastructure | src/lib/query-client.ts | 2 | 1 | 0.33 | Configuracao TanStack Query (staleTime 30s, 1 retry) |
| middleware.ts | Edge Runtime | src/middleware.ts | 0 | 0 | - | Protecao de rotas autenticadas via cookie de refresh |
| providers.tsx | Composition Root | src/app/providers.tsx | 1 | 4 | 0.80 | Composicao raiz: QueryClientProvider + AuthProvider + scheduler |
| Button | UI Component | src/components/ui/button.tsx | 16 | 2 | 0.11 | Botao pill-shaped com 6 variantes (CVA + Radix Slot) |
| components/ui/* | UI Library | src/components/ui/ | 36 (total) | 5 | 0.12 | Biblioteca de 14 componentes base (Radix + Tailwind) |
| PublicShell | Layout | src/components/layout/PublicShell.tsx | 1 | 1 | 0.50 | Shell de rotas publicas (header + footer) |
| AuthenticatedShell | Layout | src/components/layout/AuthenticatedShell.tsx | 1 | 4 | 0.80 | Shell de rotas protegidas (nav adaptativa, logout, role-based) |
| AdminGuard | Layout | src/components/layout/AdminGuard.tsx | 1 | 2 | 0.67 | Guard client-side para sub-layouts ADMIN |
| auth (feature) | Feature Module | src/features/auth/ | 10 | 4 | 0.29 | Hooks de autenticacao (login, signup, logout, activate, changePassword) |
| gyms (feature) | Feature Module | src/features/gyms/ | 10 | 5 | 0.33 | Busca, criacao e listagem de academias |
| check-ins (feature) | Feature Module | src/features/check-ins/ | 6 | 3 | 0.33 | Criacao, listagem e validacao de check-ins |
| profile (feature) | Feature Module | src/features/profile/ | 3 | 3 | 0.50 | Perfil do usuario, metricas |
| subscriptions (feature) | Feature Module | src/features/subscriptions/ | 3 | 3 | 0.50 | Criacao de assinaturas (demo) |
| admin (feature) | Feature Module | src/features/admin/ | 3 | 3 | 0.50 | Listagem de usuarios admin |
| MSW handlers | Test Infrastructure | src/test/msw/handlers.ts | 20+ | 1 | 0.05 | 14+ handlers HTTP mock para todos os endpoints |
| renderWithProviders | Test Utility | src/test/render.tsx | 20+ | 2 | 0.09 | Wrapper de render com QueryClientProvider + JWT factory |

---

## 4 -- Dependency Mapping

### Fluxo de Dependencias de Alto Nivel

```
Pages (app/) --> Feature Hooks (features/*/api/) --> API Client (lib/api.ts) --> Backend REST API
Pages (app/) --> Feature Components (features/*/components/)
Pages (app/) --> UI Components (components/ui/*)
Pages (app/) --> Auth Store (lib/auth/auth-store.ts)

Feature Hooks --> lib/api.ts (cliente OpenAPI)
Feature Hooks --> lib/errors.ts (normalizacao de erros)
Feature Hooks --> Feature Schemas (features/*/schemas/)

lib/api.ts --> lib/auth/auth-fetch-middleware.ts --> lib/auth/auth-store.ts
lib/api.ts --> lib/auth/token-refresh.ts --> lib/auth/auth-store.ts
lib/api.ts --> lib/errors.ts
lib/api.ts --> lib/query-client.ts

lib/auth/auth-store.ts --> lib/jwt.ts

Layout Shells (components/layout/) --> lib/auth/auth-store.ts
Layout Shells (components/layout/) --> components/ui/*

Root Providers (app/providers.tsx) --> lib/api.ts
Root Providers (app/providers.tsx) --> lib/auth/auth-store.ts
Root Providers (app/providers.tsx) --> lib/auth/token-refresh.ts
Root Providers (app/providers.tsx) --> lib/query-client.ts
```

### Camadas Arquiteturais

```
┌──────────────────────────────────────────────────────────┐
│  Edge Layer: middleware.ts (protecao de rotas)            │
├──────────────────────────────────────────────────────────┤
│  Presentation Layer: app/(public)/, app/(authenticated)/ │
│  (Pages, Layouts, Error Boundaries)                      │
├──────────────────────────────────────────────────────────┤
│  Layout Layer: components/layout/                        │
│  (PublicShell, AuthenticatedShell, AdminGuard)            │
├──────────────────────────────────────────────────────────┤
│  Feature Layer: features/*/                              │
│  (API hooks, Components, Schemas)                        │
├──────────────────────────────────────────────────────────┤
│  UI Layer: components/ui/                                │
│  (Button, Input, Dialog, Pagination, etc.)               │
├──────────────────────────────────────────────────────────┤
│  Infrastructure Layer: lib/                              │
│  (API client, Auth store, Token refresh, Errors, Logger) │
├──────────────────────────────────────────────────────────┤
│  External: Backend REST API, @repo/api-types             │
└──────────────────────────────────────────────────────────┘
```

### Ciclos de Dependencia

Nao foram identificados ciclos de dependencia circular entre os modulos. O fluxo de dependencias e unidirecional:

- Pages --> Features --> Lib (infraestrutura)
- Features nao importam entre si
- Lib modules possuem dependencias internas limitadas (auth-store <-- jwt, api <-- auth-middleware <-- auth-store)

### Componentes com Alto Acoplamento Bidirecional

Nenhum acoplamento bidirecional significativo foi identificado. A unica relacao circular potencial e entre `lib/api.ts` e `lib/auth/token-refresh.ts` (api importa token-refresh para instalar o scheduler, e token-refresh usa a funcao de refresh que chama o endpoint do backend), porem esta relacao e gerenciada via singleton lazy e nao constitui uma dependencia circular no grafo de modulos.

---

## 5 -- Integration Points

| Integration | Type | Location | Purpose | Risk Level |
| --- | --- | --- | --- | --- |
| Backend REST API | External API | src/lib/api.ts | Ponto unico de comunicacao com o backend Fastify; todos os hooks de feature dependem deste cliente | Critical |
| @repo/api-types | Workspace Package | package.json | Tipos OpenAPI gerados automaticamente; usados por profile e admin para tipagem de endpoints | High |
| openapi-fetch | HTTP Client Library | src/lib/api.ts, src/features/*/api/extendedPaths.ts | Cliente HTTP tipado que consome o schema OpenAPI | High |
| Next.js Edge Runtime | Framework Runtime | src/middleware.ts | Middleware de protecao de rotas executado no edge; verifica cookie de refresh para redirecionar ao login | Medium |
| Cookie httpOnly (refresh) | Browser API | src/middleware.ts, src/app/providers.tsx | Cookie de refresh token gerenciado pelo backend; frontend verifica existencia para decisoes de autenticacao | Medium |
| Sonner | Notification Library | src/lib/api.ts, src/components/ui/toaster.tsx | Toast notifications para erros de forced-logout e feedback de acoes | Low |
| Web Vitals API | Browser API | src/app/web-vitals.tsx, src/lib/observability.ts | Coleta de metricas de performance (LCP, FID, CLS, etc.) com sink plugavel | Low |

---

## 6 -- Architectural Risks & Single Points of Failure

| Risk Level | Component | Issue | Impact | Details |
| --- | --- | --- | --- | --- |
| Critical | lib/api.ts | Ponto unico de comunicacao com backend | System-wide | Todas as chamadas HTTP passam por este modulo singleton. Uma falha no middleware chain (auth, error normalization) afeta todas as features simultaneamente |
| Critical | lib/auth/auth-store.ts | Ponto unico de estado de autenticacao | System-wide | 14 modulos dependem deste store. Corrupao do estado (token, user, expiresAt) impacta toda a aplicacao |
| High | lib/auth/token-refresh.ts | Refresh proativo como unico mecanismo de renovacao | Authentication | Se o scheduler falhar silenciosamente, o token expira e todas as requisicoes autenticadas falham com 401. O replay no middleware de fetch e o fallback |
| High | lib/errors.ts | Normalizacao de erros centralizada | Error Handling | 17 modulos importam ApiError/mapStatusToMessage. Uma mudanca na interface de erro propaga para toda a aplicacao |
| High | extendedPaths (gyms, check-ins) | Tipos manuais fora do schema OpenAPI | Type Safety | Os modulos gyms e check-ins definem tipos manualmente em extendedPaths.ts para endpoints ausentes em @repo/api-types. Esses tipos podem divergir do backend |
| Medium | Edge Middleware | Verificacao apenas de existencia de cookie | Security | O middleware verifica se o cookie `refreshToken` ou `refresh_token` existe, mas nao valida seu conteudo. Um cookie expirado ou invalido passa pelo middleware, resultando em 401 na camada de API |
| Medium | toApiError() duplicada | Funcao repetida em 6 features | Maintainability | A funcao de conversao de erro esta duplicada em auth, gyms, check-ins, profile, subscriptions e admin. Mudancas precisam ser replicadas manualmente |
| Medium | DEMO_PLANS hardcoded | Dados de pricing hardcoded no frontend | Business Logic | Planos de assinatura (Premium Mensal R$ 69,90, Premium Anual R$ 59,90/mes) estao definidos como constantes no frontend, nao provem do backend |

---

## 7 -- Environment Variables

| Variable | Description | Used In | Scope | Is Active | Risk Level | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | URL base da API backend REST | src/lib/api.ts, playwright.config.ts, todos os arquivos de teste | All environments | Sim | High | Variavel critica: define o endpoint de comunicacao com o backend. Fallback: `http://localhost:3333`. Exposta ao cliente via prefixo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_LOG_LEVEL` | Nivel de log do logger frontend (debug, info, warn, error, silent) | src/lib/observability.ts | All environments | Sim | Low | Controla verbosidade do logger. Fallback: `info`. Nao afeta funcionalidade |
| `FRONTEND_PORT` | Porta do servidor Next.js para testes E2E | playwright.config.ts | E2E Testing | Sim | Low | Usado apenas pelo Playwright. Fallback: `3000` |
| `BACKEND_PORT` | Porta do servidor backend para testes E2E | playwright.config.ts | E2E Testing | Sim | Low | Usado apenas pelo Playwright. Fallback: `3333` |
| `PLAYWRIGHT_BASE_URL` | URL base para testes Playwright | playwright.config.ts | E2E Testing | Sim | Low | Override opcional da URL do frontend nos testes E2E |
| `CI` | Indicador de ambiente de CI/CD | playwright.config.ts | CI/CD | Sim | Low | Controla retries (2 em CI), workers (1 em CI), reporter (github + html), forbidOnly, reuseExistingServer |

---

## 8 -- Technology Stack Assessment

### Framework e Runtime

| Tecnologia | Versao | Relevancia Arquitetural |
| --- | --- | --- |
| Next.js | 16.2.4 | Framework principal; App Router, React Server Components, Edge Middleware, route groups |
| React | 19.2.4 | Biblioteca de UI; hooks, composicao de componentes, Suspense |
| TypeScript | ^5 | Tipagem estatica; strict mode habilitado, path aliases configurados |

### Gerenciamento de Estado

| Tecnologia | Versao | Relevancia Arquitetural |
| --- | --- | --- |
| TanStack Query | ^5.59.0 | Server state management; staleTime 30s, 1 retry, keepPreviousData para paginacao |
| Zustand | 5.0.12 | Client state management; auth store global com event bus customizado |

### UI e Estilizacao

| Tecnologia | Versao | Relevancia Arquitetural |
| --- | --- | --- |
| Tailwind CSS | ^4.2.4 | Utility-first CSS; design tokens monocromaticos em globals.css via @theme |
| shadcn/ui | (components.json: new-york) | Componentes base sobre Radix primitives; pill-shaped, zero shadows |
| Radix UI | Dialog 1.1.15, Dropdown 2.1.16, Slot 1.2.4, Tabs 1.1.13 | Primitivas de acessibilidade headless |
| class-variance-authority | 0.7.1 | Variantes de componentes tipadas (Button com 6 variantes, 4 tamanhos) |
| Lucide React | 1.14.0 | Biblioteca de icones |
| Sonner | 2.0.7 | Toast notifications monocromaticos |

### API Client e Validacao

| Tecnologia | Versao | Relevancia Arquitetural |
| --- | --- | --- |
| openapi-fetch | ^0.13.0 | Cliente HTTP tipado via OpenAPI schema; middleware chain para auth e error handling |
| @repo/api-types | workspace:* | Tipos gerados do spec OpenAPI do backend; pacote compartilhado no monorepo |
| Zod | 4.3.6 | Validacao runtime de formularios e respostas de API |
| React Hook Form | 7.75.0 | Gerenciamento de formularios com resolver Zod |
| @hookform/resolvers | 5.2.2 | Bridge entre React Hook Form e Zod |

### Testes

| Tecnologia | Versao | Relevancia Arquitetural |
| --- | --- | --- |
| Vitest | 4.1.5 | Framework de teste de unidade; jsdom, coverage v8 |
| @testing-library/react | 16.3.2 | Render helpers para testes de componentes React |
| @testing-library/user-event | 14.6.1 | Simulacao de interacoes de usuario |
| @testing-library/jest-dom | 6.9.1 | Matchers customizados para DOM assertions |
| MSW | 2.14.2 | Mock Service Worker; 14+ handlers para todos os endpoints |
| Playwright | 1.59.1 | Testes E2E; 5 spec files, helpers de provisioning via SQL |
| @axe-core/playwright | 4.11.3 | Testes de acessibilidade WCAG automatizados |

### Tooling

| Tecnologia | Versao | Relevancia Arquitetural |
| --- | --- | --- |
| Biome | 2.4.13 | Lint + format unificado; tabs, double quotes, complexidade cognitiva max 5 |
| PostCSS | (via @tailwindcss/postcss 4.2.4) | Pipeline CSS para Tailwind |

### Padroes Arquiteturais em Uso

- **Feature-Based Modular Architecture:** Cada dominio de negocio e um modulo isolado em `features/`
- **Custom Hooks Pattern:** TanStack Query hooks encapsulam toda logica de data fetching
- **Query Key Factory:** Padrao `xxxKeys` para gerenciamento de query keys
- **Route Group Layout Pattern:** Next.js `(public)` e `(authenticated)` com shells distintos
- **Edge Middleware Authentication:** Protecao server-side de rotas via verificacao de cookie
- **Proactive Token Refresh:** Scheduler que renova JWT 60s antes da expiracao
- **OpenAPI-First:** Tipos de API gerados automaticamente do spec do backend
- **MSW-Based Test Isolation:** Testes independentes de rede via Mock Service Worker

---

## 9 -- Security Architecture and Risks

| Risk Level | Area | Issue | Details |
| --- | --- | --- | --- |
| High | Token Storage | JWT access token armazenado em memoria JavaScript | O token fica no Zustand store (volatil). E a abordagem correta para evitar XSS via localStorage, porem qualquer extensao de browser ou codigo injetado com acesso ao contexto JS pode le-lo via `useAuthStore.getState().accessToken` |
| High | Extended Paths | Tipos manuais em extendedPaths.ts | Os arquivos `features/gyms/api/extendedPaths.ts` e `features/check-ins/api/extendedPaths.ts` definem tipos manualmente fora do schema OpenAPI. Se o backend alterar a forma da resposta, o frontend nao detecta a divergencia em tempo de compilacao |
| Medium | Edge Middleware | Verificacao superficial de cookie | O middleware em `src/middleware.ts` verifica apenas a existencia do cookie `refreshToken` ou `refresh_token`, sem validar conteudo, expiracao ou assinatura. Um cookie vazio nao-nulo permitiria acesso a rotas protegidas (resultando em 401 posterior na API) |
| Medium | CORS/CSRF | Sem configuracao visivel de CORS ou CSRF | Nao ha evidencia de configuracao de CORS ou protecao CSRF no frontend (esta responsabilidade e do backend). O cookie de refresh e httpOnly, mitigando parcialmente riscos de XSS |
| Low | JWT Decode | Decode sem verificacao criptografica | `src/lib/jwt.ts` faz decode do JWT via `atob()` sem verificar assinatura. Isso e aceitavel para extracao de claims no frontend (a verificacao ocorre no backend), mas significa que o frontend confia em claims nao verificadas para decisoes de UI (ex: role ADMIN) |
| Low | API URL | URL do backend exposta ao cliente | `NEXT_PUBLIC_API_URL` e exposta no JavaScript do cliente por design (prefixo `NEXT_PUBLIC_`). Isso e esperado, mas expoe o endpoint do backend a qualquer visitante da pagina |
| Low | Test Credentials | Provisioning de usuarios via SQL direto | Os helpers E2E (`e2e/helpers/auth.ts`, `e2e/helpers/seed.ts`) executam comandos `psql` diretamente. Estes sao restritos ao ambiente de teste, porem a string de conexao e lida de variaveis de ambiente sem validacao |

---

## 10 -- Infrastructure Analysis

Nota: Nao foram encontrados arquivos de infraestrutura proprios do frontend (Dockerfile, docker-compose.yml, kubernetes, CI/CD pipelines). A configuracao do Playwright (`playwright.config.ts`) orquestra servidores de desenvolvimento para testes E2E, mas nao constitui infraestrutura de deployment.

O Playwright configura dois web servers para E2E:
- Backend: `pnpm --filter backend dev` com health check em `/health-check`
- Frontend: `pnpm --filter frontend dev` com timeout de 120s

Comportamento em CI:
- Workers reduzidos a 1
- Retries configurados em 2
- Reporter: GitHub + HTML
- `forbidOnly: true` (previne `.only()` acidental)
- `reuseExistingServer: false` (garante servidores limpos)

A secao de infraestrutura de deployment foi omitida por ausencia de evidencia de arquivos dedicados.
