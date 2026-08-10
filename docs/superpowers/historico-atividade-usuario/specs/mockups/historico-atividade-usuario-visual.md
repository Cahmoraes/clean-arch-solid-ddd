---
created_at: "2026-08-10T20:20:35-03:00"
updated_at: "2026-08-10T20:20:35-03:00"
---

# Mockup Visual — Aba "Atividade" (Histórico de Atividade do Usuário)

## Fonte de design original

Nenhuma — layout definido apenas via mockup do companion (comparação lado a lado de duas opções, opção B aprovada).

## Decisão visual

Feed de atividade **agrupado por data** (cabeçalhos "Hoje", "Ontem", data completa por extenso) com **ícone circular colorido por tipo de evento**, em vez de uma lista cronológica plana.

- Cabeçalho de grupo: texto uppercase, `font-size: 11px`, `font-weight: 600`, `letter-spacing: .04em`, cor `--color-subtle` (`#6f6f68`).
- Item: ícone circular (26px, `border-radius: 9999px`) + coluna com descrição (`text-sm`, `--color-foreground`) e horário (`text-xs`, `--color-subtle`).
- Cor do ícone por categoria:
  - Check-in → fundo `rgba(57,229,140,.16)`, ícone `--color-accent` (`#39e58c`)
  - Eventos de segurança (senha alterada, conta bloqueada) → fundo `rgba(255,180,67,.16)`, ícone `--color-warning` (`#ffb443`)
  - Eventos de conta/perfil/role/status (vínculo Google, atualização de perfil, mudança de role, mudança de status) → fundo `--color-surface-3` (`#242424`), ícone `--color-muted-foreground`
- Espaçamento entre itens: `margin-bottom: 10px`; entre grupos: `margin: 14px 0 8px` antes do próximo cabeçalho.

## Core HTML (representativo, extraído do mockup aprovado)

```html
<div class="group-heading">Hoje</div>
<div class="grouped-item">
  <div class="type-icon checkin">◎</div>
  <div>
    <div class="grouped-text">Check-in — Academia Vila Olímpia</div>
    <div class="grouped-time">07:42</div>
  </div>
</div>

<div class="group-heading">Ontem</div>
<div class="grouped-item">
  <div class="type-icon security">⚿</div>
  <div>
    <div class="grouped-text">Senha alterada</div>
    <div class="grouped-time">21:10</div>
  </div>
</div>
```

```css
.type-icon {
  width: 26px; height: 26px; border-radius: 9999px;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.type-icon.checkin  { background: rgba(57,229,140,.16); color: var(--color-accent); }
.type-icon.security { background: rgba(255,180,67,.16); color: var(--color-warning); }
.type-icon.profile  { background: var(--color-surface-3); color: var(--color-muted-foreground); }
```

Na implementação, os símbolos de placeholder (`◎`, `⚿`, `☺`) devem ser substituídos por ícones reais da biblioteca já usada no projeto (`lucide-react`), mantendo as cores/fundos por categoria acima.

## Design tokens aplicados

Extraídos do tema real do projeto (VOLT design system, tema escuro padrão):

| Token | Valor |
|---|---|
| `--color-background` | `#080808` |
| `--color-card` / `--color-surface` | `#161616` |
| `--color-surface-3` | `#242424` |
| `--color-border` | `#2a2a2a` |
| `--color-foreground` | `#f6f6f4` |
| `--color-muted-foreground` | `#a3a39c` |
| `--color-subtle` | `#6f6f68` |
| `--color-accent` / primary | `#39e58c` |
| `--color-warning` | `#ffb443` |
| Fonte body | Inter (`--font-sans`) |
| Fonte display | Space Grotesk (`--font-display`) |

## Fidelidade

O mockup é um norte, não a tela pixel-final. A fidelidade final (ícones reais via `lucide-react`, ajuste fino de espaçamento) é construída na task de implementação do frontend, reaproveitando os componentes já existentes (`EmptyState`, `Avatar`, `Tabs`) do design system do projeto.
