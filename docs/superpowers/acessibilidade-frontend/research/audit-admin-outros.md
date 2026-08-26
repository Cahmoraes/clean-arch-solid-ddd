---
created_at: "2026-08-26T14:57:46-03:00"
updated_at: "2026-08-26T14:57:46-03:00"
---

# Auditoria WCAG 2.2 — Admin, Assinatura, Perfil, Notificações, Busca e Command Palette

Skill `wcag-audit-patterns --mode review` seguida (Procedimento de auditoria + `scenario-matrix.md` + detectores por princípio), com a matriz de cenários restrita aos 8 critérios pedidos: `1.1.1`, `2.1.1`, `2.4.6`, `2.4.7`, `2.5.3`, `2.5.8`, `3.3.2`, `4.1.2`.

**Escopo efetivamente inventariado** (arquivos lidos por completo):
- `features/admin/**` (analytics, user-detail, user-row, user-filter-bar, bulk-action-bar, bulk-status-confirmation-dialog)
- `features/profile/components/EditProfileModal.tsx`
- `components/notification/*` e `components/ui/theme-toggle.tsx` (mapeados no lugar de `features/notification/**`, que não existe no repo)
- `app/(authenticated)/assinatura/page.tsx`
- `components/ui/search-bar.tsx`
- `components/command-palette/**`
- Como apoio de julgamento (não auditados exaustivamente, só o ponto de uso): `components/ui/{button,input,avatar,dialog,sheet,alert-dialog}.tsx` e `app/globals.css`

## Falhas encontradas (6 itens, 14 problemas)

### 3.3.2 — Rótulos ou Instruções · A · 🔴 Crítico · 4 problemas

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| Campo usa apenas placeholder como rótulo. | `components/ui/search-bar.tsx:71-76` (variante `<input>` nu, sem `onActivate`) — materializado em produção por `app/(authenticated)/admin/usuarios/page.tsx:399`, que passa só `placeholder="Buscar por nome ou e-mail..."` | Exigir `aria-label`/`id`+`<label>` na API do componente, ou dar um `aria-label` default sensato quando nenhum for passado |
| Campo obrigatório sem indicação textual de obrigatoriedade. | `features/profile/components/EditProfileModal.tsx:82-97` (`Input id="profile-name"`, `updateProfileSchema` exige `min(5)`) | Adicionar `required aria-required="true"` no `<Input>` e um indicador textual/asterisco junto ao `<Label>` |
| Campo obrigatório sem indicação textual de obrigatoriedade. | `features/admin/components/user-detail/details-edit-form.tsx:121-126` (`Input id="edit-name"`) | idem |
| Campo obrigatório sem indicação textual de obrigatoriedade. | `features/admin/components/user-detail/details-edit-form.tsx:135-141` (`Input id="edit-email"`) | idem |

### 4.1.2 — Nome, Função, Valor · A · 🔴 Crítico · 1 problema

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| Input type='search' sem nome acessível (label, aria-label). | `components/ui/search-bar.tsx:71-76` (mesma ocorrência do cascata acima) | idem — componente precisa forçar nome acessível |

### 2.4.6 — Cabeçalhos e Rótulos · AA · 🟡 Médio · 1 problema

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| Campo sem rótulo programático (nenhum `name`/`label` definido pelo chamador). | `components/ui/search-bar.tsx:71-76` | idem |

### 2.5.3 — Rótulo no Nome · A · 🟡 Médio · 1 problema

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| Uso apenas de placeholder 'Buscar por nome ou e-mail...' sem label. | `components/ui/search-bar.tsx:71-76` | idem |

### 2.4.7 — Foco Visível · AA · 🟠 Alto · 3 problemas

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| Estilo `outline-none` remove indicador de foco sem substituto — anula até o reset global `*:focus-visible` de `app/globals.css:177-180`, porque a classe utilitária Tailwind vive na camada `utilities`, que sempre vence a camada `base` independente da ordem/especificidade. | `components/ui/search-bar.tsx:74` (`<input>` nu) | Trocar `outline-none` pela técnica de anel duplo decidida no design, aplicada no wrapper ou no input |
| `Command.Input` com `outline-none` sem substituto — é o alvo de foco funcional real da paleta (onde o usuário digita). | `components/command-palette/command-palette.tsx:50` | Adicionar o anel duplo (ou ao menos manter um `border`/`ring` visível no container ao focar) |
| `Content` do Radix Dialog com `focus:outline-none` sem substituto. | `components/command-palette/command-palette.tsx:33` | Mesmo ajuste; impacto menor porque normalmente o foco inicial pula para o `Command.Input` focável, mas o container ainda pode receber foco em cenários de erro/timing |

## Confirmações (PASSOU) — itens já indicados no contexto e verificados

- `components/notification/notification-bell.tsx:55-61` — `<button aria-label={ariaLabel} aria-expanded aria-haspopup>` com `<Bell aria-hidden="true">`. Satisfaz `4.1.2`, `2.1.1`, `1.1.1`.
- `components/ui/theme-toggle.tsx:45-60` e `:65-87` — ambos `<button aria-label={ariaLabel} aria-pressed={isDark}>` com ícone `aria-hidden="true"`. Satisfaz `4.1.2`, `2.1.1`, `1.1.1`.
- `features/admin/components/user-detail/user-actions-footer.tsx:45-53` — `<Button size="icon" aria-label="Editar dados">` com `EditIcon aria-hidden="true"`. Satisfaz `4.1.2`, `2.1.1`, `1.1.1`, `2.5.8` (40×40px).
- `features/admin/components/user-detail/more-actions-menu.tsx:157-171` — mesmo padrão, `aria-label="Mais ações"`.
- `features/admin/components/bulk-action-bar.tsx:58-67` — `<Button size="sm" aria-label="Limpar seleção">` com `<X aria-hidden="true">`.
- `features/admin/components/user-filter-bar.tsx:86-94` — botão com texto visível "Filtros" + `aria-label="Abrir filtros"` (contém a palavra visível → `2.5.3` ok).
- `features/admin/components/user-row.tsx:52-67,110-181` — padrão correto de `role="button"` custom: `tabIndex={0}`, `onKeyDown` para `Enter`/`Espaço`, `aria-pressed`, checkbox extraído como irmão (não aninhado) — satisfaz `2.1.1`/`4.1.2` sem usar `<div onClick>` cru.
- `app/(authenticated)/assinatura/page.tsx:96-146` — `<input type="radio">` `sr-only` dentro de `<label htmlFor>`, com `focus-within:ring-2` no card — nome acessível correto e foco visível propagado ao cartão inteiro.
- `features/admin/components/user-detail/details-edit-form.tsx` e `features/profile/components/EditProfileModal.tsx` — todos os `<Input>`/`<select>` têm `<label htmlFor>` casando com `id`; o `Input` do shadcn (`components/ui/input.tsx:14`) usa `focus-visible:ring-1`, não `outline-none` puro — foco visível ok. Único problema real é a ausência de `required`/indicação textual (ver 3.3.2 acima).
- **2.1.1 (Teclado)** — nenhum `<div>`/`<span> onClick` cru encontrado no escopo; todo controle interativo é `<button>` nativo, `<Command.Item>` (cmdk gerencia role/teclado) ou o padrão `role="button"`+`tabIndex`+`onKeyDown` de `user-row.tsx`. **Veredito do critério inteiro: PASSOU.**

## N/A justificados

- `1.1.1` para imagens fotográficas/`<img>`: nenhum `<img>` cru no escopo; `Avatar` (`components/ui/avatar.tsx`) é `<span aria-hidden="true">` com iniciais, sempre ao lado do nome visível em texto — decorativo legítimo, N/A.
- `2.5.3` para os botões ícone-only listados em "Confirmações": não há texto visível para divergir do nome acessível — critério não se aplica a controles sem rótulo visível.
- Botão "Close" nativo do `DialogPrimitive`/`SheetPrimitive` (`components/ui/dialog.tsx:48-53`, `components/ui/sheet.tsx:77-81`, usado por `EditProfileModal` e `UserDetailContainer`): tem `aria-label`/`sr-only "Close"` — satisfaz `4.1.2`/`2.1.1`/`1.1.1` para os 8 critérios auditados. Fica registrado como observação **fora do escopo desta auditoria** (não é um dos 8 critérios pedidos) que o texto está em inglês num app 100% PT-BR — é um item de `3.1.2`, explicitamente excluído do escopo pedido.

## Achados adicionais fora da lista de "já conhecidos" (mesmos 8 critérios)

### 1.1.1 — Conteúdo Não Textual · A · 🟡 Médio (rebaixado do base 🔴; ver nota) · 4 problemas

Ícones `lucide-react` renderizados como `<svg>` sem `aria-hidden="true"`, fora de qualquer controle interativo (portanto não cobertos por `4.1.2`, apenas por `1.1.1`):

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| Ícone decorativo sem aria-hidden (`CheckCircle2`, ao lado do texto "Academia saudável"). | `features/admin/analytics/components/at-risk-alert-zone.tsx:62` | Adicionar `aria-hidden="true"` |
| Ícone decorativo sem aria-hidden (`AlertTriangle`, ao lado da contagem de membros em risco). | `features/admin/analytics/components/at-risk-alert-zone.tsx:79` | Adicionar `aria-hidden="true"` |
| Seta decorativa do `<select>` sem aria-hidden (`ChevronDown`). | `features/admin/components/user-detail/details-edit-form.tsx:175` | Adicionar `aria-hidden="true"` |
| Seta decorativa do `<select>` sem aria-hidden (`ChevronDown`). | `features/admin/components/user-detail/details-edit-form.tsx:209` | Adicionar `aria-hidden="true"` |

Nota de julgamento: o detector padrão da skill trata *todo* `<svg>` como "gráfico" e cobraria `🔴 Crítico` + "sem descrição detalhada vinculada" mesmo para ícones puramente decorativos ao lado de texto equivalente — isso é uma limitação conhecida do detector automático, documentada na própria referência (`detectors-perceivable.md`). Como aqui a informação já está disponível como texto visível adjacente, o impacto real para leitor de tela é baixo/médio, então classifiquei como 🟡 Médio em vez do base 🔴. Ainda assim é uma correção de uma linha. Todos os outros SVGs do escopo (Search, Bell, BellOff, X, EditIcon, MoreActionsIcon, Filter, ícones de `notification-item.tsx`, sparkline de `kpi-card-with-sparkline.tsx`, ícones do `command-palette`) já têm `aria-hidden="true"` corretamente aplicado — PASSOU.

## Pendente de runtime

Dois botões de texto sem `padding`/`min-height` explícitos, com `text-xs` (12px) — sinal estático insuficiente para afirmar com certeza que a caixa renderizada fica abaixo de 24px:

| Elemento | Local | O que medir |
|---|---|---|
| Botão "Marcar todas lidas" | `components/notification/notification-dropdown.tsx:75-81` | `getBoundingClientRect()` — se altura < 24px, aplicar `min-height:24px` + padding vertical (WCAG 2.5.8) |
| Botão "ver todos"/"ver menos" | `features/admin/analytics/components/at-risk-alert-zone.tsx:86-93` | idem |

Demais alvos interativos do escopo (todos os `Button`/ícone-only via `size="icon"` = 40×40px, `size="sm"` = 32px de altura, cartão de plano em `assinatura/page.tsx`, checkbox de `user-row.tsx`) já atingem ≥24×24px pelo tamanho declarado no design system — não ficaram pendentes de medição.

## Resumo por critério (veredito final dos 8 pedidos)

| SC | Veredito |
|---|---|
| `1.1.1` | FALHOU (4 problemas, ver acima) |
| `2.1.1` | PASSOU |
| `2.4.6` | FALHOU (1 problema) |
| `2.4.7` | FALHOU (3 problemas) |
| `2.5.3` | FALHOU (1 problema) |
| `2.5.8` | PASSOU nos itens verificáveis estaticamente; 2 pendências de runtime |
| `3.3.2` | FALHOU (4 problemas) |
| `4.1.2` | FALHOU (1 problema) |

**Origem das correções**: todas as ocorrências caem em código do próprio módulo auditado (`search-bar.tsx`, `command-palette.tsx`, `details-edit-form.tsx`, `EditProfileModal.tsx`, `at-risk-alert-zone.tsx`) — nenhuma depende de shell/design-system para ser corrigida; os componentes de terceiros (`Button`, `Input`, `Dialog`, `Sheet`, `AlertDialog`) já implementam o padrão correto de foco/nome e foram usados como referência de correção acima.
