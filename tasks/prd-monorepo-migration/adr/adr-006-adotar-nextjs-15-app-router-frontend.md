ADR006 — Adotar Next.js 15 com App Router como Framework do Frontend

- Status: Aceito
- Data: 02/05/2026
- Autor: Time de Arquitetura

---

## Decisão

Adotaremos o **Next.js 15** com **App Router** e **TypeScript** como framework do frontend,
utilizando Server Components por padrão e TanStack Query para gerenciamento de estado do servidor
no lado cliente.

## Contexto

O projeto precisava de um frontend web para consumir a API REST do backend (usuários, academias,
check-ins, assinaturas Stripe). As decisões de contexto relevantes:
- O backend é TypeScript; o frontend deve ser TypeScript para compartilhar `@repo/api-types`
- A stack deve ser moderna, com suporte a SSR/SSG para SEO e performance
- TanStack Query foi definido como requisito pelo time para gerenciamento de cache e mutations
- A equipe tem familiaridade com React

Next.js 15 é a versão estável mais recente (lançada em outubro de 2024) e inclui o App Router
como modo padrão, além de integrar o Turbopack como bundler de desenvolvimento por default.

## Opções Consideradas

- **Opção 1 — Vite + React SPA**
  - Prós: setup simples; sem opinião sobre roteamento; altamente flexível
  - Contras: sem SSR nativo; requer configuração manual de roteamento (React Router, TanStack Router); sem otimizações de bundle automáticas; não adequado para SEO sem configuração extra

- **Opção 2 — Remix**
  - Prós: excelente modelo de dados com loaders/actions; SSR nativo; foco em web standards
  - Contras: menor adoção que Next.js; curva de aprendizado em loaders/actions; integração com TanStack Query menos natural no modelo Remix

- **Opção 3 — Next.js 15 com App Router** *(SELECIONADA)*
  - Prós: SSR e SSG nativos; Server Components reduzem bundle cliente; App Router é o padrão recomendado pela Vercel; TypeScript first-class; TanStack Query tem integração bem documentada com App Router; Turbopack como bundler de dev (velocidade significativamente superior ao Webpack); maior ecossistema e comunidade
  - Contras: App Router tem complexidade conceitual maior (Server vs. Client Components); caching comportamento mudou significativamente no Next.js 15 (fetch sem cache por padrão); curva de aprendizado para quem vem do Pages Router

- **Opção 4 — Next.js 14 com Pages Router**
  - Prós: modelo mais familiar; menos mudanças de API
  - Contras: Pages Router é legacy; Next.js 15 é a versão estável atual; migrar depois seria mais custoso

## Consequências

- ✅ Positivo: Server Components permitem buscar dados diretamente no servidor, reduzindo JavaScript enviado ao cliente
- ✅ Positivo: TypeScript nativo e compatível com `@repo/api-types` sem configuração extra
- ✅ Positivo: Turbopack integrado acelera o ciclo de desenvolvimento (HMR mais rápido)
- ✅ Positivo: `pnpm create next-app` gera scaffold completo e atualizado
- ❌ Negativo: `fetch` no Next.js 15 não faz cache por padrão (mudança da v14) — requer uso explícito de `cache: 'force-cache'` ou TanStack Query para cache cliente
- ❌ Negativo: distinção entre Server e Client Components requer atenção ao usar contextos React (ex: `QueryClientProvider` deve ser `"use client"`)

## Recomendações

- Sessão de design arquitetural (02/05/2026) — Next.js 15 com App Router escolhido como único framework avaliado, dado requisito de TypeScript + TanStack Query + SSR definido no PRD
