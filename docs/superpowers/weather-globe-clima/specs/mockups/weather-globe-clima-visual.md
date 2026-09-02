---
created_at: "2026-09-01T21:07:54-03:00"
updated_at: "2026-09-02T09:37:38-03:00"
---

# Mockup visual — Globo 3D panorâmico em `/clima`

## Intenção visual

O layout aprovado é o **B: globo panorâmico**. A página abre com copy e busca no topo, seguida por um globo escuro e largo que centraliza o marcador da cidade consultada. O card de clima fica abaixo, preservando a leitura numérica e evitando que o globo vire a interface principal.

## Core HTML de referência

```html
<section class="clima-hero">
  <div class="copy">
    <span>Consulta de clima</span>
    <h1>O clima no mapa antes dos números.</h1>
    <p>A cidade pesquisada centraliza o globo, e os dados aparecem abaixo.</p>
    <form class="search-row">
      <input value="Lisboa" aria-label="Cidade" />
      <button>Consultar</button>
    </form>
  </div>

  <div class="globe-panel" aria-label="Mapa 3D centrado em Lisboa">
    <div class="globe"></div>
    <div class="marker"></div>
    <p>Destino selecionado: Lisboa</p>
  </div>

  <article class="weather-result">
    <span>Agora em Lisboa</span>
    <strong>18°C</strong>
    <dl>
      <div><dt>Mínima</dt><dd>15°C</dd></div>
      <div><dt>Máxima</dt><dd>21°C</dd></div>
    </dl>
  </article>
</section>
```

## Tokens aplicados

- Fundo: `#080808`; card: `#161616`; superfície secundária: `#1d1d1d`.
- Borda: `#2a2a2a`; texto principal: `#f6f6f4`; texto muted: `#a3a39c`.
- Acento: `#39e58c`; marcador/atenção: `#ffb443`.
- Radius: cards grandes em torno de `22px`; controles em torno de `14px`.
- Tipografia: `Space Grotesk` para títulos, `Inter` para texto, `JetBrains Mono` para temperatura.

## Decisões para implementação

- O globo deve ser largo no desktop e continuar acima do resultado em mobile.
- A busca permanece visível antes do resultado e não deve depender do globo.
- O marcador representa apenas a cidade consultada mais recente.
- O fallback estático deve manter o mesmo painel visual e trocar apenas a renderização WebGL por uma representação não animada.

## Fonte original

Nenhuma fonte externa. O mockup foi criado no Visual Companion em `.superpowers/brainstorm/3321760-1788351683/content/clima-globe-layout.html`.

## Nota de fidelidade

Este artefato é um norte visual. A implementação final deve usar componentes reais da aplicação e ajustar responsividade, estados de loading/erro e controles conforme o código existente.
