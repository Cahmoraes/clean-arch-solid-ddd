# Formas e Tipografia Retrô Replaced: Norte Visual

**Fonte de design original:** nenhuma; decidido no companion visual do brainstorming (2026-09-24).

## Decisões

- **Canto:** variante B (chanfrado) escolhida entre A (reto seco), B (chanfrado) e C (bisel de hardware). Implementação real: `corner-shape: bevel` nos quatro cantos, tamanho vindo de `--radius-*`; fallback reto.
- **Fonte:** variante T2 (VT323) escolhida entre T1 (JetBrains Mono), T2 (VT323) e T3 (Press Start 2P). Em títulos, eyebrows, rótulos, botões (maiúsculas), KPIs e badges. Inter no texto corrido e nos valores digitados.
- **Textura:** scanlines atrás do conteúdo, só tema escuro, só em PixelScene, hero, KPI e sidebar.
- **Caret:** bloco ciano.

## Tokens aplicados (tema escuro)

background `#0a1424`, card `#0d1b2e`, surface-2 `#101f36`, border `#16304d`, border-strong `#4a6d94`, muted `#9db4cc`, primary `#ff3ea5` / fg `#0a1424`, accent `#3ee0ff`. Chanfros: xs 2, sm 4, md 6, lg 10, xl 12 (px).

## Core HTML/CSS (norte)

```html
<div class="card crt-scanlines">            <!-- rounded-xl: chanfro 12px -->
  <p class="eyebrow">// Painel</p>          <!-- VT323 15px, maiúsculas, accent -->
  <h3 class="title">Check-ins da semana</h3><!-- VT323 30px -->
  <p class="desc">Acompanhe sua frequência nas academias.</p> <!-- Inter 13px -->
  <span class="kpi">42</span><span class="badge">Ativo</span> <!-- VT323 44px / badge rounded-sm -->
  <label class="label">Buscar academia</label>               <!-- VT323 15px -->
  <input class="input" value="Iron Gym" />   <!-- rounded-md, caret bloco ciano -->
  <button class="btn primary">Salvar</button><!-- rounded-md, VT323 20px maiúsculas -->
</div>
```

```css
.crt-scanlines { position: relative; isolation: isolate; }
.crt-scanlines::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: repeating-linear-gradient(to bottom, rgb(0 0 0 / .22) 0 1px, transparent 1px 3px);
}
```

**Fidelidade:** norte, não pixel-final. A fidelidade final sai das tasks, conferida no navegador nos dois temas.
