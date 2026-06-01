---
created_at: "2026-06-01T15:49:14-03:00"
updated_at: "2026-06-01T15:49:14-03:00"
---

# PRD: Badges de Contagem no Filtro de Usuários Admin

## Visão Geral

Administradores da plataforma precisam de uma visão rápida da composição da base de usuários ao abrir a página de gerenciamento. Atualmente, os pills de filtro (`/admin/usuarios`) não exibem contagens — o admin não sabe quantos membros, admins ou usuários inativos existem sem realizar filtragens manuais.

Este PRD formaliza o requisito de exibir badges de contagem nos pills de filtro da página admin, alinhando o comportamento ao padrão já aprovado e implementado nos check-ins.

## Objetivos

- O administrador visualiza, sem nenhuma ação adicional, o total de usuários em cada categoria ao acessar `/admin/usuarios`.
- As contagens refletem o estado real da base após qualquer mutação (promoção, rebaixamento, exclusão).
- O comportamento de loading não exibe dados enganosos (zero não é um dado válido enquanto a resposta não chegou).

## Histórias de Usuário

**US-01 — Visão geral de contagens**
Como administrador, eu quero ver o total de usuários de cada categoria diretamente nos pills de filtro para que eu entenda a composição da plataforma sem precisar alternar entre filtros.

**US-02 — Atualização após mutações**
Como administrador, eu quero que as contagens se atualizem automaticamente após promover, rebaixar ou excluir um usuário para que os badges sempre reflitam o estado atual.

**US-03 — Loading sem dados falsos**
Como administrador, eu quero que os pills não exibam zeros enquanto as contagens estão carregando para que eu não confunda um estado transitório com dados reais.

## Funcionalidades Principais

### F-01 — Badges de contagem nos pills de filtro

Exibe um badge verde flutuante no canto superior direito de cada pill do filtro de usuários, mostrando o total de usuários daquela categoria.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-001 | O pill "Todos" exibe o total geral de usuários na plataforma. |
| RF-002 | O pill "Membros" exibe o total de usuários com role `MEMBER`. |
| RF-003 | O pill "Administradores" exibe o total de usuários com role `ADMIN`. |
| RF-004 | O pill "Ativos" exibe o total de usuários com status ativo. |
| RF-005 | O pill "Inativos" exibe o total de usuários com status inativo. |
| RF-006 | Os badges são exibidos somente após as contagens serem carregadas com sucesso. |
| RF-007 | Durante o carregamento das contagens, os pills são exibidos sem badge (sem placeholder de zero). |
| RF-008 | Em caso de erro ao buscar as contagens, os pills são exibidos sem badge (degradação silenciosa). |

### F-02 — Atualização automática dos badges após mutações

As contagens se tornam desatualizadas quando um usuário é promovido, rebaixado ou excluído. O sistema deve invalidar e recarregar as stats automaticamente após essas ações.

**Requisitos funcionais:**

| ID | Requisito |
|---|---|
| RF-009 | Ao promover um usuário para admin, as contagens de stats são invalidadas e recarregadas. |
| RF-010 | Ao revogar o papel de admin de um usuário, as contagens são invalidadas e recarregadas. |
| RF-011 | Ao realizar soft-delete de um usuário, as contagens são invalidadas e recarregadas. |

## Experiência do Usuário

**Fluxo principal:**

1. Admin acessa `/admin/usuarios`.
2. A página renderiza os pills de filtro sem badges (loading state).
3. Em até 30 segundos (staleTime existente), os badges surgem nos pills com as contagens reais.
4. O admin pode usar os filtros normalmente — os badges permanecem visíveis na categoria selecionada e nas demais.

**Comportamento visual:**
- Badge: círculo verde (#39e58c) flutuante no canto superior direito do pill.
- Badge visível tanto no pill ativo quanto nos inativos.
- Transição de "sem badge" para "com badge" ocorre naturalmente sem layout shift.

**Acessibilidade:**
- Os valores numéricos dos badges são parte do texto do botão para leitores de tela (comportamento herdado do `SegmentedControl` existente).

## Restrições Técnicas de Alto Nível

- As contagens são fornecidas pelo endpoint `GET /users/stats` já existente — nenhuma mudança de backend é necessária.
- As stats utilizam cache do TanStack Query com `staleTime: 30_000` ms (comportamento existente do `useUserStats()`).
- A invalidação de cache deve ocorrer no lado do cliente, nas callbacks `onSuccess` das mutations relevantes.

## Fora de Escopo

- Qualquer alteração no backend ou em endpoints existentes.
- Badges na rota `/check-ins` (já implementado).
- Badges em outras rotas além de `/admin/usuarios`.
- Filtros combinados (ex.: "membros ativos") — as contagens refletem categorias independentes.
- Animação ou skeleton nos badges durante loading.
- Exportação ou exibição das contagens fora dos pills de filtro.
