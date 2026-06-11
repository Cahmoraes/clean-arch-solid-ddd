# CONTEXT.md — Glossário de Domínio e Arquitetura

Vocabulário compartilhado do backend. Termos daqui devem ser usados exatamente como definidos — em código, documentação, ADRs e revisões de arquitetura.

## Conceitos de Domínio

### Bounded Contexts

- **User** — usuários, perfil, senha, status, roles (`src/user/`)
- **Gym** — academias, busca por nome e proximidade (`src/gym/`)
- **Check-In** — check-ins, validação de distância e tempo (`src/check-in/`)
- **Session** — autenticação JWT, logout, refresh token (`src/session/`)
- **Subscription** — assinaturas Stripe, webhooks (`src/subscription/`)
- **Notification** — notificações por evento de domínio, entrega via SSE/Redis (`src/notification/`)

### Coordinate (compartilhado)

Value object de coordenada geográfica (latitude/longitude) com o cálculo de distância (Haversine) como comportamento próprio: `coordinate.distanceTo(other)`.

- **Vive em**: `shared/domain` (decisão de 2026-06-01 — antes vivia no Check-In e era importado pelo contexto Gym, vazando entre bounded contexts)
- **Única fonte de verdade** para distância geográfica. Nenhum outro módulo reimplementa Haversine.
- Consumidores: `Distance` (Check-In), entidade `Gym`, `GymRepository`, adapters de repositório.

## Conceitos de Arquitetura

### Categoria de Erro (Error Kind)

Toda classe de erro de negócio estende a base abstrata **`DomainError`** (`shared/domain/error/domain-error.ts`) e declara uma **categoria semântica** obrigatória — o que o erro *é*, não como ele vira HTTP:

- `conflict` — estado atual impede a operação (ex: usuário já existe)
- `not-found` — recurso solicitado não existe
- `unauthorized` — identidade não comprovada
- `forbidden` — identidade comprovada, mas sem permissão
- `validation` — entrada estruturalmente válida, mas viola regra de negócio

A tradução categoria → status HTTP é responsabilidade de **um único módulo de infra** (seam HTTP). Erros de domínio/aplicação nunca conhecem códigos HTTP; controllers nunca conhecem erros individuais. Erros fora da hierarquia `DomainError` (ZodError, Error genérico) caem no fallback (400/500).

### RouteGuard

Módulo único de autenticação e autorização de rotas HTTP, em `shared/infra/server/guard/`. Encapsula atrás de uma interface: verificação de token JWT, checagem de role admin e checagem de sessão revogada. Dependências (AuthToken, RevokedTokenDAO, Logger) entram por injeção — nunca via `container.get()` em construtor.

- **Interface**: dado um request + a política da rota (`isProtected`, `onlyAdmin`), retorna `Either<AccessDenied, AuthenticatedUser>`.
- O adapter HTTP (FastifyAdapter) apenas traduz Fastify ↔ RouteGuard; não contém política de acesso.
- Substitui os handlers criados inline (`AuthenticateHandler`, `AdminRoleCheck`, `CheckSessionRevokedHandler`).

### Política de Rota (Route Policy)

As flags que um controller declara ao registrar uma rota (`isProtected`, `onlyAdmin`, `rateLimit`). É a entrada do RouteGuard — o controller declara *o que* a rota exige; o RouteGuard decide *como* verificar.
