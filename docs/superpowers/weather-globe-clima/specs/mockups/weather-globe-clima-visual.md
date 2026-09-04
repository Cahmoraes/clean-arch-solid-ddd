# Mockup visual — Globo 3D em /clima

## Decisão

Entre duas direções mostradas lado a lado no companion (mapa plano com Leaflet vs.
globo 3D com `globe.gl`/`react-globe.gl`), o usuário escolheu o **globo 3D**.

## Layout / hierarquia

- Campo de busca por cidade permanece no topo, sem alterações visuais.
- Globo 3D fica logo abaixo do campo de busca, mesma largura de card usada pelas demais
  seções da tela `/clima`.
- Painel de resultado (`CurrentWeatherDisplay`: temperatura atual + grid 2 colunas de
  mín/máx) permanece inalterado, apenas re-renderizado quando o clique no globo dispara
  uma nova consulta.

## Estilo

- Tema escuro (padrão do projeto via `next-themes`), consistente com o resto da tela.
- Esfera do globo com brilho sutil em `--primary` (`#39e58c`), sem texturas
  fotorrealistas de superfície — reforça o visual flat/dark já usado nos cards.
- Cantos do card do globo com o mesmo radius (`--r-card`, 12px) dos demais cards da tela.

## Core (representativo, não literal)

```html
<div class="opt selected" data-choice="globe">
  <h3>Globo 3D rotativo</h3>
  <div class="search">
    <input placeholder="Buscar cidade..." />
    <button>Consultar</button>
  </div>
  <div class="map-globe">
    <div class="globe-sphere"></div>
  </div>
  <div class="card-row">
    <div class="stat"><div class="v">24°</div><div class="l">atual</div></div>
    <div class="stat"><div class="v">18° / 29°</div><div class="l">mín / máx</div></div>
  </div>
</div>
```

## Design tokens aplicados

```
primary: #39e58c (emerald accent)   bg: #080808   card: #161616   border: #2a2a2a
radius:  button 8px   card 12px
font:    display Space Grotesk   sans Inter   mono JetBrains Mono
```

## Fonte de design original

Nenhuma — layout definido apenas via mockup do companion (`layout.html`, opção "globe").

## Fidelidade

Este mockup é um *norte*, não a tela pixel-final. A implementação real substitui a
esfera estilizada por um globo `react-globe.gl` funcional com polígonos de país
clicáveis; cores/brilho exatos são ajustados durante a implementação.
