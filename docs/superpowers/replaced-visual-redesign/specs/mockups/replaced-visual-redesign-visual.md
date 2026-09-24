# Replaced Visual Redesign: Direção Visual "Noite neon"

Norte visual aprovado no companion (opção A de `replaced-directions`). Não é o layout pixel-final.

## Intenção de design

- Minimalismo moderno com atmosfera de Replaced: noite azul-petróleo, neon magenta e ciano usados com parcimônia, luz volumétrica sugerida por feixes, skyline pixelada como pano de fundo.
- A arte pixel vive só em pontos de destaque: login, hero do dashboard e estados vazios. O resto da interface é limpo e denso.
- Glow só em bordas e formas. Texto em off-white, sem glow.
- A paleta é interpretação da estética, não cópia: o jogo não publica paleta oficial.

## Estrutura do dashboard (KPI + hero)

```html
<div class="app">
  <aside class="sb"><div class="logo"></div><nav><i class="on"></i><i></i><i></i><i></i><i></i></nav></aside>
  <main>
    <header><span class="eb">Visão geral</span><h1>Dashboard</h1></header>
    <section class="kpis"><div class="kpi hl">128</div><div class="kpi">14</div><div class="kpi">6</div></section>
    <section class="hero"><div class="beam"></div><div class="beam alt"></div><div class="sky"><div class="win"></div></div></section>
  </main>
</div>
```

## Tokens aplicados (dark, valores-alvo a validar por cálculo de contraste)

| Token | Valor-alvo |
|---|---|
| fundo | `#0a1424` |
| superfície escalonada | `#0d1b2e`, `#101f36` |
| borda | `#16304d` |
| texto | `#dbe9f7` (off-white frio) |
| primary (magenta) | `#ff3ea5`, texto em cima em cor escura |
| acento secundário (ciano) | `#3ee0ff` |
| sidebar | `#0b1626`, escura nos dois temas |

Tema claro "dia de neblina": fundo `#f3f6fa`; magenta escurecido próximo de `#cc0077` e ciano próximo de `#00708a`.

## Cena (`PixelScene`)

- Skyline: retângulos em degraus em duas camadas de profundidade, janelas acesas como pontos com máscara que some para cima.
- Feixes de luz: faixas inclinadas em ciano e magenta com opacidade baixa.
- Dither: padrão 4x4 sobre a cena, escala inteira.
- Movimento sutil: deriva lenta dos feixes e cintilar suave das janelas.

## Fonte de design original

Nenhuma; layout definido apenas via mockup do companion (`redesign-directions.html`, `replaced-directions.html`).

## Fidelidade

Este artefato é um norte. A fidelidade final é construída na implementação, com contraste e aparência conferidos no navegador real.
