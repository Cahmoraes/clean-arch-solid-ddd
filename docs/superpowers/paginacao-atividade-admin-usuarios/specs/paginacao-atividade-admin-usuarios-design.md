---
created_at: "2026-08-29T15:36:18-03:00"
updated_at: "2026-08-29T15:36:18-03:00"
---

# Design — Paginação da Atividade no Admin

## Visão Geral

Em `/admin/usuarios`, a aba "Atividade" do drawer de detalhes do usuário exibe todos os
eventos retornados pelo endpoint (hoje até 20, sem paginação — decisão de v1 registrada em
`historico-atividade-usuario`), rolando indefinidamente dentro do painel. Esta feature:

1. Limita o card do drawer a 5 itens mais recentes.
2. Adiciona um botão "Ver histórico completo" que leva a uma nova rota dedicada.
3. Cria `/admin/usuarios/[userId]/atividade`, reaproveitando os componentes já existentes
   (`ActivityTab`, `NumberedPagination`, hook `useUserActivity`) no mesmo padrão de
   paginação já usado em `/perfil` (`paginacao-historico-atividade-perfil`).

Continuação direta de uma decisão já registrada duas vezes como fora de escopo: quando
`/perfil` ganhou paginação, alterar o endpoint administrativo foi explicitamente excluído.
Esta feature fecha essa lacuna.

## Características Arquiteturais

**Priorizadas (top 2):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Consistência | Reaproveitar 100% do padrão de paginação já validado em `/perfil`, sem criar um segundo jeito de paginar atividade | Nova tela usa os mesmos componentes (`ActivityTab`, `NumberedPagination`) sem fork de lógica |
| Manutenibilidade | `ActivityTab` é compartilhado por 3 features; não deve ganhar uma responsabilidade nova ("modo resumo") | Nenhuma alteração de comportamento no `ActivityTab` — corte e navegação ficam no componente pai |

**Consideradas, não priorizadas:** performance (volume por usuário é baixo, paginação de 20 já é suficiente), i18n (sem expansão prevista).

## Especificação Visual

**Artefato curado:** `mockups/paginacao-atividade-admin-usuarios-visual.md`

**Fonte de design original:** Nenhuma; layout definido via mockup do visual companion, usando os tokens reais do tema do projeto.

**Decisões visuais (norte, não pixel-final):**
- Card resumido no drawer mantém a aparência atual do `ActivityTab`, só corta para 5 itens e perde o footer de paginação.
- Botão "Ver histórico completo" abaixo do card, estilo secundário, condicionado a `pagination.total > 5`.
- Nova tela espelha o card de `/perfil`: breadcrumb mono, título + pill "20 por página", `ActivityTab` completo + `NumberedPagination`.

**Fidelidade:** reuso direto de componentes já existentes — sem construção visual nova.

## Decisões Arquiteturais

### D1. Corte de itens e navegação ficam no componente pai, não no `ActivityTab`

- **Contexto:** É preciso exibir só 5 itens no drawer admin, mas o mesmo `ActivityTab` é usado (com paginação completa) em `/perfil` e na nova tela. Alternativas: (a) prop `maxItems`/`limit` no `ActivityTab`; (b) corte e botão de navegação no componente pai, sem tocar o `ActivityTab`.
- **Decisão:** Opção (b) — `user-detail-panel.tsx` corta a resposta para 5 `events` e omite a prop `pagination` ao renderizar `ActivityTab`; o botão "Ver histórico completo" vive no painel, fora do `ActivityTab`.
- **Justificativa técnica:** O footer de paginação do `ActivityTab` já só renderiza quando a prop `pagination` está presente — omiti-la é suficiente para escondê-lo, sem lógica condicional nova no componente compartilhado.
- **Justificativa de negócio:** Reduz risco de regressão num componente usado por 3 features já em produção; menor superfície de revisão.
- **Trade-offs aceitos:** O componente pai precisa saber que só usa 5 de N itens (conhecimento que, com a opção (a), ficaria encapsulado no `ActivityTab`). Aceito porque é uma regra de apresentação do admin, não uma regra do componente de atividade em si.

### D2. Extensão do endpoint existente em vez de endpoint novo

- **Contexto:** `GET /users/:userId/activity` hoje hardcoda `page: 1` e descarta o objeto `pagination` que o use case já calcula. Alternativas: (a) estender esse endpoint para aceitar `page`; (b) criar um endpoint novo separado para a listagem completa.
- **Decisão:** Opção (a).
- **Justificativa técnica:** O use case (`GetUserActivityUseCase`) já computa `pagination` internamente — é descartado só pelo controller. Estender é uma mudança de 1-2 arquivos (controller + schema de resposta); um endpoint novo duplicaria contrato e autorização (`onlyAdmin`) já existentes.
- **Justificativa de negócio:** Menor esforço de implementação para reabrir uma decisão que já foi deliberadamente adiada, não redesenhada.
- **Trade-offs aceitos:** Nenhum novo — o comportamento de `page=1` (implícito hoje) permanece o default quando `page` não é enviado, então nenhum consumidor existente quebra.

## Estrutura de Componentes

| Componente | Responsabilidade | Depende de | Do que depende |
|---|---|---|---|
| `GetUserActivityController` (`get-user-activity.controller.ts`) | Aceitar `page` na query, repassar ao use case, incluir `pagination` na resposta | `GetUserActivityUseCase` | Rota `ACTIVITY: /:userId/activity` |
| `useUserActivity` (hook, variante admin) | Repassar `page` na query key/fetch quando `userId` está definido | `fetchAdminActivity` | `user-detail-panel.tsx`, nova rota |
| `UserDetailPanel` (`user-detail-panel.tsx`) | Cortar resposta para 5 itens, renderizar `ActivityTab` sem `pagination`, mostrar botão condicional | `ActivityTab`, `useUserActivity` | Drawer de `/admin/usuarios` |
| `AdminUserActivityPage` (novo, `atividade/page.tsx`) | Montar `ActivityTab` + `NumberedPagination` com paginação completa, breadcrumb/header do usuário | `ActivityTab`, `NumberedPagination`, `useUserActivity` | Rota `/admin/usuarios/[userId]/atividade` |

Nenhum componente novo com lógica própria — `AdminUserActivityPage` é montagem (assembly) dos componentes já existentes, sem abstração nova.

## Fluxo de Dados

1. **Drawer admin:** `UserDetailPanel` monta → `useUserActivity(userId, { page: 1 })` busca `GET /users/:userId/activity?page=1` → resposta traz `events` (até 20) + `pagination` → painel corta para 5 `events`, passa ao `ActivityTab` sem `pagination` → botão "Ver histórico completo" aparece se `pagination.total > 5`, linkando para `/admin/usuarios/{userId}/atividade`.
2. **Nova tela:** `AdminUserActivityPage` monta com `userId` da rota → `useUserActivity(userId, { page })` (estado `page` local, iniciando em 1) → `GET /users/:userId/activity?page={page}` → `events` + `pagination` completos passados ao `ActivityTab` → `NumberedPagination` dispara mudança de `page`.

## Endpoint

`GET /users/:userId/activity` (admin-only, `onlyAdmin: true`, inalterado)

- **Query (nova):** `page?: number` (default `1`) — mesmo schema zod de `GET /users/me/activity`.
- **Resposta (alterada):** `{ events: UserActivityListItem[], pagination: { page, pageSize, total, totalPages } }` — `pageSize` fixo em 20.
- **Sem mudança:** guard `onlyAdmin`, `GetUserActivityUseCase`, regras de negócio, merge de `UserActivityEvent` + `CheckIn`.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Consumidor existente do endpoint depender do formato de resposta atual (sem `pagination`) | 2 | 1 | 2 🟢 | Campo é aditivo (nunca removido), e único consumidor conhecido é o próprio frontend, atualizado na mesma feature |
| Query key da variante admin do hook não incluir `page`, causando cache incorreto entre páginas | 2 | 2 | 4 🟡 | Espelhar exatamente o padrão já usado e testado em `fetchMyActivity`/`userActivityQueryKey` (perfil) |

## Testes

- **Backend:** controller aceita `page` e retorna `pagination` correto para `/users/:userId/activity` (unitário/integração, espelhando os testes já existentes de `get-my-activity.controller.ts`).
- **Frontend:** `UserDetailPanel` renderiza no máximo 5 itens e oculta o botão quando `pagination.total <= 5`; exibe e navega corretamente quando `> 5`.
- **Frontend:** nova rota `/admin/usuarios/[userId]/atividade` navega entre páginas via `NumberedPagination`, preservando o padrão de `placeholderData`/cache já usado em `/perfil`.
