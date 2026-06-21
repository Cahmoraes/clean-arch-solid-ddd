---
created_at: "2026-06-21T20:13:43-03:00"
updated_at: "2026-06-21T20:13:43-03:00"
---

# Design — Sidebar Recolhível (Collapse/Expand)

## Visão Geral

Adicionar ao `AuthenticatedShell` do frontend a capacidade de **recolher e expandir o menu lateral** (estilo Perplexity), liberando espaço de tela. Quando recolhido, a sidebar vira um **trilho de ícones** (~76px) com tooltips; quando expandido, volta à largura completa (268px). A preferência é **persistida em cookie** e lida no servidor, evitando flicker no carregamento. O recurso é **desktop-only**: em telas estreitas (≤860px) o app já força o trilho de ícones e esse comportamento permanece inalterado.

Escopo fechado em brainstorming:
- Recolhido = **trilho de ícones** (não ocultar totalmente).
- Persistência = **cookie** (não localStorage, não só-memória).
- Toggle ativo apenas no **desktop** (≥861px); mobile mantém o trilho forçado atual.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade | O ganho de espaço só vale se a transição for limpa e o estado persistir | Sem flicker de largura no reload; transição de largura animada (`transition`); preferência sobrevive a reload e nova sessão |
| Acessibilidade | Itens só com ícone ficam irreconhecíveis e podem perder nome acessível | Cada item recolhido tem nome acessível (`aria-label`/`sr-only`, nunca só `display:none`) + tooltip no hover **e** focus; toggle com `aria-expanded`/`aria-controls` |
| Manutenibilidade / baixo risco | Feature pequena num shell já funcional; evitar regressão | Reuso do trilho/tokens existentes; nenhuma reescrita do shell; lint/tsc/test/build 100% |

**Consideradas, não priorizadas:** escalabilidade (UI local, não se aplica), i18n (labels já em PT-BR, sem expansão prevista), performance bruta (custo desprezível).

## Componentes Lógicos

- **Estado de Recolhimento** — `apps/frontend/src/lib/ui-state/sidebar-collapse-store.ts` (Zustand). *Mantém em memória se a sidebar está recolhida e expõe `toggle`/`setCollapsed`.* Fonte única de verdade no client. Depende de: nada. Dependido por: shell, alternador, hook de teclado.
- **Persistência em Cookie** — `apps/frontend/src/lib/ui-state/sidebar-collapse-cookie.ts`. *Lê (no servidor) e grava (no client) a preferência de recolhimento num cookie para sobreviver a reloads sem flicker.* Depende de: APIs de cookie (`next/headers` no server, `document.cookie` no client). Dependido por: `layout.tsx` (leitura) e store (escrita na mudança).
- **Alternador de Recolhimento** — botão chevron no `<aside>` + atalho `Cmd/Ctrl+B`. *Dispara a alternância entre recolhido e expandido por clique ou teclado.* Depende de: store. Dependido por: nada.
- **Trilho de Navegação Adaptável** — o `<aside>` do `AuthenticatedShell` dirigido pelo estado. *Renderiza a navegação em largura completa ou em trilho de ícones com tooltips conforme o estado.* Depende de: store, itens de navegação.

## Especificação Visual

**Artefato curado:** `mockups/sidebar-collapse-toggle-visual.md` (prosa + core HTML + tokens, relativo a este spec)

**Fonte de design original:** Nenhuma ferramenta externa; layout definido via mockup do companion visual desta sessão, ancorado nos tokens reais do `globals.css`. Referências de inspiração: Perplexity (trilho de ícones), claude.ai (recolhimento).

**Decisões visuais (norte, não pixel-final):**
- Recolhido = trilho de ~76px só com ícones, centralizados; expandido = 268px com labels.
- Pílula de item ativo: fundo branco / texto escuro no tema claro (`--color-sidebar-active`), verde no escuro.
- Botão de toggle: chevron circular discreto na borda direita do `<aside>` (alterna direção conforme estado).
- Tooltip de label só quando recolhido, aparecendo à direita do ícone no hover/focus.
- Tokens aplicados: `--color-sidebar` (#111110), `--color-sidebar-foreground`, `--color-sidebar-muted`, `--color-sidebar-border`, `--color-primary` (#39e58c), raio `--radius-md`.

**Fidelidade:** o mockup é um *norte*. A fidelidade final é construída na task de implementação, reusando os tokens já existentes do design system.

## Fluxo de Dados

1. **No servidor** (`apps/frontend/src/app/(authenticated)/layout.tsx`): lê o cookie `sidebar:collapsed` via `next/headers` e injeta `defaultCollapsed` no provider/inicializador que hidrata o store. O HTML inicial já vem com a largura correta → **sem flicker**.
2. **No client:** clique no alternador ou `Cmd/Ctrl+B` → `store.toggle()` → store grava o cookie via `document.cookie` → o `<aside>` anima a largura (268px ↔ 76px).
3. **Reconciliação responsiva:** abaixo de 860px o trilho continua **forçado por media query** (independe do estado do usuário). O toggle só tem efeito visual em ≥861px. Estado visual recolhido = `recolhidoPeloUsuário || viewportEstreito`.

## Decisões Arquiteturais

### D1. Cookie em vez de localStorage para persistência

- **Contexto:** A preferência de recolhimento precisa sobreviver a reloads. Alternativas: cookie, localStorage, só-memória (Zustand).
- **Decisão:** Persistir num cookie `sidebar:collapsed`, lido no servidor (App Router) e escrito no client.
- **Justificativa técnica:** Só o cookie é legível no SSR antes do primeiro paint; localStorage só existe no client → causaria flash de largura no reload.
- **Justificativa de negócio:** O flicker de layout é o defeito mais visível desse tipo de feature em apps SSR; eliminá-lo é o que torna o recurso "polido".
- **Trade-offs aceitos:** Leitura/escrita de cookie em dois lugares (server e client); o cookie viaja em cada request (payload mínimo, valor booleano).

### D2. Estender o shell custom em vez de adotar o `Sidebar` do shadcn/ui

- **Contexto:** O `AuthenticatedShell` é uma implementação custom (não usa o `Sidebar` do shadcn) e já tem o trilho de ícones responsivo.
- **Decisão:** Estender o shell atual, reusando o CSS de trilho existente; não adotar o `Sidebar` do shadcn.
- **Justificativa técnica:** Adotar o shadcn exigiria re-encaixar header, command palette, notification bell e footer de avatar nos slots do `Sidebar`, re-estilizar para os tokens da sidebar escura, e o Sheet mobile do shadcn conflitaria com a decisão "mobile inalterado".
- **Justificativa de negócio:** Menor superfície de regressão e menor custo para um único toggle; alinhado à convenção do projeto de não recorrer sempre ao shadcn.
- **Trade-offs aceitos:** Persistência por cookie, tooltip e atalho de teclado são implementados à mão (incremento pequeno — o app já faz `Cmd+K` e `aria-current`).

### D3. Estado visual derivado (`usuário OR largura`)

- **Contexto:** Há duas fontes de "recolhido": a media query ≤860px (forçada) e a escolha do usuário no desktop.
- **Decisão:** O estado visual recolhido é derivado de `recolhidoPeloUsuário || viewportEstreito`; a media query continua dona do caso forçado.
- **Justificativa técnica:** Uma única expressão de "recolhido" evita classes conflitantes; mantém o CSS responsivo atual intacto.
- **Trade-offs aceitos:** Exige cobrir os dois gatilhos nos testes (desktop togglado e viewport estreito).

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Flicker no reload se o cookie não for lido no servidor | 3 | 2 | 6 🔴 | Leitura do cookie no `layout.tsx` (server) e injeção de `defaultCollapsed` antes do primeiro paint; teste cobrindo render inicial recolhido |
| Regressão de a11y: labels ocultos perdem nome acessível | 2 | 2 | 4 🟡 | Itens recolhidos usam `aria-label`/`sr-only` + tooltip no hover/focus; teste de nome acessível |
| Dupla fonte de "recolhido" gera labels inconsistentes | 2 | 2 | 4 🟡 | Estado visual derivado único; testes nos dois breakpoints |
| `Cmd/Ctrl+B` conflita com atalho do browser | 1 | 2 | 2 🟢 | `preventDefault` no handler; `B` está livre (`K` é do command palette) |

## Tratamento de Erros / Edge Cases

- Cookie ausente/inválido → tratado como `expandido` (default seguro).
- SSR sem acesso a `next/headers` (rota fora do grupo autenticado) → não se aplica; o shell só existe em `(authenticated)`.
- Toggle pressionado em viewport estreito → sem efeito visual (media query forçada vence), mas o estado do usuário é preservado para quando voltar ao desktop.

## Testes

- **Unitários (Vitest + Testing Library, PT-BR, `test()`):**
  - Store: `toggle` inverte o estado; `setCollapsed` define explicitamente.
  - Cookie: escrita serializa o booleano; leitura interpreta ausência como `expandido`.
  - `AuthenticatedShell`: renderiza recolhido quando `defaultCollapsed=true`.
  - Alternador: clique inverte o estado e atualiza `aria-expanded`/`aria-label`.
  - A11y: item recolhido expõe nome acessível; tooltip aparece no focus.
  - Teclado: `Cmd/Ctrl+B` alterna o estado.
- **E2E (Playwright, opcional):** recolher → reload → permanece recolhido (persistência via cookie).

## Definição de Pronto

- `pnpm --filter frontend lint:fix`, `tsc:check`, `test`, `build` passam 100%.
- Sem flicker observável no reload com a sidebar recolhida.
- Navegação por teclado e leitor de tela funcionam em ambos os estados.
