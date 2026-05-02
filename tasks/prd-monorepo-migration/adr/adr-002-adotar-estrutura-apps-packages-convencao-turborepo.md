ADR002 — Adotar Estrutura `apps/*` + `packages/*` como Convenção do Monorepo

- Status: Aceito
- Data: 02/05/2026
- Autor: Time de Arquitetura

---

## Decisão

Adotaremos a estrutura de diretórios convencional do Turborepo — `apps/backend/`,
`apps/frontend/` e `packages/api-types/` — em vez de manter `backend/` e `frontend/` na raiz
do repositório.

## Contexto

Ao converter o repositório em monorepo, surgiu a questão de como organizar fisicamente os
workspaces. O código backend existia na raiz; o design inicial do brainstorming propôs mover
para `backend/` e `frontend/` na raiz. Ao aprofundar a análise técnica durante a Tech Spec,
identificou-se que a convenção oficial do Turborepo (`apps/*` + `packages/*`) oferece vantagens
práticas e de ecossistema que superam a simplicidade aparente de manter apps na raiz.

Estrutura adotada:

```
clean-arch-solid-ddd/
├── apps/
│   ├── backend/     ← código atual do backend
│   └── frontend/    ← novo app Next.js
└── packages/
    └── api-types/   ← pacote interno @repo/api-types
```

## Opções Consideradas

- **Opção 1 — Apps na raiz** (`backend/`, `frontend/`, `packages/api-types/`)
  - Prós: mais simples visualmente; sem pasta intermediária `apps/`
  - Contras: foge da convenção Turborepo; `pnpm-workspace.yaml` precisaria de padrões customizados; dificulta o uso de templates e exemplos oficiais; adicionar um terceiro app exigiria refatoração de scripts

- **Opção 2 — Convenção Turborepo** (`apps/*` + `packages/*`) *(SELECIONADA)*
  - Prós: alinhada com documentação oficial e todos os templates do Turborepo; `pnpm-workspace.yaml` usa padrões genéricos (`apps/*`, `packages/*`) sem necessidade de listagem explícita; escala para N apps sem mudança estrutural; ecossistema de ferramentas (ex: Vercel deploy) detecta a estrutura automaticamente
  - Contras: adiciona um nível de diretório (`apps/`) que pode parecer redundante com apenas 2 apps

## Consequências

- ✅ Positivo: `pnpm-workspace.yaml` usa globs genéricos, sem necessidade de listar cada workspace explicitamente
- ✅ Positivo: novos apps (`apps/mobile/`, `apps/admin/`) podem ser adicionados sem alterar configurações existentes
- ✅ Positivo: templates oficiais, exemplos da comunidade e documentação do Turborepo são diretamente aplicáveis
- ✅ Positivo: separação semântica clara entre "aplicações deployáveis" (`apps/`) e "pacotes internos reutilizáveis" (`packages/`)
- ❌ Negativo: todos os caminhos relativos do backend precisaram ser revisados após o `git mv` (ex: `prisma/`, `.env`, scripts)

## Recomendações

- Tech Spec de migração para monorepo (02/05/2026) — convenção Turborepo escolhida durante esclarecimentos técnicos para maximizar compatibilidade com o ecossistema
