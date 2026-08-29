---
created_at: "2026-08-29T15:36:18-03:00"
updated_at: "2026-08-29T15:36:18-03:00"
---

# Especificação Visual — Paginação da Atividade no Admin

Artefato curado a partir da sessão do visual companion (brainstorming). Direção de layout, não pixel-final.

## Decisões visuais

- **Card resumido (drawer de `/admin/usuarios`, aba "Atividade")**: mantém exatamente a aparência atual do `ActivityTab` (agrupamento por dia, ícone circular por tipo de evento, timestamp em mono) — a única mudança é o corte para 5 itens e o desaparecimento do footer de paginação (que já só renderiza quando a prop `pagination` existe).
- **Botão "Ver histórico completo"**: abaixo do `ActivityTab`, full-width, estilo secundário (`bg-surface-3`, borda `border-border`, radius `--radius-sm`), com seta indicando navegação. Só aparece quando `pagination.total > 5`.
- **Nova tela (`/admin/usuarios/[userId]/atividade`)**: reaproveita o card do `/perfil` como referência — `Card` com `radius: --radius-card (22px)`, breadcrumb mono acima do título (`admin / usuários / <nome> / atividade`), header com título "Histórico de atividades" e pill "20 por página", `ActivityTab` completo (com `pagination`) e `NumberedPagination` no footer, mesmo padrão do `/perfil`.

## Tokens aplicados

- Cor primária: `#39e58c` (accent), `#22c976` (strong)
- Fundo: `#080808` (bg) / card `#161616` / superfícies aninhadas `#1d1d1d`/`#242424`
- Texto: foreground `#f6f6f4`, muted `#a3a39c`, subtle `#6f6f68`
- Radius: card `22px`, elementos menores `8px`/`14px`
- Fontes: display `Space Grotesk` (títulos), sans `Inter` (corpo), mono `JetBrains Mono` (timestamps, contadores, breadcrumb)
- Tema escuro é o padrão da aplicação (via `next-themes`)

## Core HTML de referência

```html
<!-- Card resumido no drawer admin -->
<div class="activity-card tight">
  <div class="group-label">HOJE</div>
  <ul class="activity-list">
    <li class="activity-row">
      <div class="icon-badge">✓</div>
      <div>
        <div class="activity-text">Check-in realizado na unidade Centro</div>
        <div class="activity-ts">14:32</div>
      </div>
    </li>
    <!-- ... até 5 itens, sem footer de paginação ... -->
  </ul>
  <button class="see-all-btn">Ver histórico completo →</button>
</div>

<!-- Nova tela completa -->
<div class="full-screen-card">
  <div class="full-crumb">admin / usuários / joão.silva / atividade</div>
  <div class="full-header">
    <div class="full-title">Histórico de atividades</div>
    <span class="pill-pp">20 por página</span>
  </div>
  <!-- ActivityTab completo com pagination -->
  <footer class="pager">
    <div class="pager-summary">Exibindo 1–20 de 143 atividades</div>
    <!-- NumberedPagination -->
  </footer>
</div>
```

## Fonte de design original

Nenhuma; layout definido apenas via mockup do visual companion, derivado dos tokens reais do tema do projeto (`apps/frontend/src/app/globals.css`) e da estrutura já existente do `ActivityTab`/`NumberedPagination` usados em `/perfil`.

## Fidelidade

Este mockup é um *norte*. A implementação reutiliza os componentes reais (`ActivityTab`, `NumberedPagination`, `Card`) exatamente como já existem — não há novo componente visual a construir, então a fidelidade final é automática por reuso, não por reconstrução.
