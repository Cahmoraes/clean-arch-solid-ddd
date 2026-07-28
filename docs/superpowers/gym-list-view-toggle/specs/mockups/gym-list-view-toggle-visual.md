# Mockup — Toggle de Visualização em Linhas para Academias

Renderizado no companion visual desta sessão (`toggle-layout.html`), comparando duas opções de toggle e as duas visualizações lado a lado. Opção escolhida pelo usuário: **A — segmented control com ícones**.

## Toggle escolhido (Opção A)

```html
<div class="v-seg">
  <button class="active">▦</button> <!-- LayoutGrid, view "cards" -->
  <button>☰</button>                <!-- List, view "rows" -->
</div>
```

- Container: `border: 1px solid var(--v-border); background: var(--v-surface-2); border-radius: var(--v-r-md); padding: 3px;`
- Botão ativo: `background: var(--v-fg); color: var(--v-bg);`
- Botões: 34×34px, ícone-apenas, sem label de texto.
- Na implementação, reusa `SegmentedControl` (ver D1 no design) — leve divergência visual aceita (pílula em vez de quadrado).

## Visualização em cards (atual, sem alteração)

```html
<div class="v-cards">
  <div class="v-card">
    <div class="v-img"></div>
    <div class="v-body">
      <p class="v-name">Academia Central</p>
      <p class="v-meta">Av. Paulista, 1000</p>
      <span class="v-cta">Check-in</span>
    </div>
  </div>
  <!-- ... -->
</div>
```

## Visualização em linhas (nova)

```html
<div class="v-rows">
  <div class="v-row">
    <div class="v-thumb"></div>
    <div class="v-info">
      <p class="v-name">Academia Central</p>
      <p class="v-meta">Av. Paulista, 1000</p>
    </div>
    <span class="v-cta">Check-in</span>
  </div>
  <!-- ... -->
</div>
```

- Container: `border: 1px solid var(--v-border); border-radius: var(--v-r-lg); overflow: hidden;` (lista vertical, sem gap entre itens).
- Cada linha: `display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-bottom: 1px solid var(--v-border);` (última linha sem borda).
- Thumbnail: 44×44px, `border-radius: var(--v-r-sm)`.
- Nome em `Space Grotesk`, meta (localização) em `--v-subtle`.
- CTA de check-in mantém o mesmo estilo/pill verde (`--v-accent`) do card.

## Tokens aplicados

`--v-bg` `#080808`, `--v-surface` `#161616`, `--v-accent` `#39e58c`, `--v-accent-fg` `#0a0a0a`, `--v-border` `#2a2a2a`, raios `--v-r-sm` `8px` / `--v-r-md` `14px` / `--v-r-lg` `22px` / `--v-r-full` `9999px`, fonte de display `Space Grotesk`.

## Fidelidade

Este mockup é um *norte* de layout e hierarquia, não uma especificação pixel-final. `GymRow` deve replicar o conteúdo completo de `GymCard` (disponibilidade, descrição opcional, telefone/"Ver detalhes", link de edição admin) — o HTML acima simplifica para nome + localização + CTA por brevidade do mockup.
