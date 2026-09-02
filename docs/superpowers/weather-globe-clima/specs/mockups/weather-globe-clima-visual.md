---
created_at: "2026-09-01T21:07:54-03:00"
updated_at: "2026-09-01T21:07:54-03:00"
---

# Especificação Visual — WeatherGlobe (`/clima`)

**Fonte de design original:** nenhuma; layout definido apenas via mockup do companion (comparação de duas opções).

## Decisões visuais (norte, não pixel-final)

- **Layout aprovado: globo como hero, sempre visível, acima da busca.** A página `/clima`
  continua uma coluna centralizada (max-width ~448px): título → descrição → **globo 3D** →
  formulário de busca → card de resultado do clima.
- O globo fica sempre montado (não só após uma busca) e gira sozinho (auto-rotação) por
  padrão; quando um resultado de busca chega, ele anima até a cidade encontrada.
- Tamanho do globo no hero: grande o suficiente para ser o elemento visual dominante do
  topo, mas sem empurrar o card de resultado para fora da dobra em telas pequenas
  (~120px de diâmetro no mockup, proporcional à coluna de 448px).
- Indicador visual do local: um marcador/ponto simples na superfície do globo, na cor
  primária do tema.
- Alternativa rejeitada: globo pequeno embutido dentro do card de resultado (só aparece
  após busca) — descartada por reduzir o impacto visual e por ficar escondida até a
  primeira busca.

## Tokens aplicados

- **Cor primária:** `#39e58c` (mesma usada como acento em toda a aplicação, dark e light)
- **Fundo do globo:** gradiente radial escuro (`#123a2c` → `#061410` → `#020403`), com brilho
  externo sutil em `rgba(57, 229, 140, 0.18)`
- **Borda do card/página mock:** `--color-border: #2a2a2a` (dark) / `#e4e4dc` (light)
- **Radius:** `--radius-sm: 8px` (inputs/botões), `--radius-md: 14px` (cards)
- **Tipografia:** Space Grotesk (título), Inter (corpo)

## Core HTML de referência (globo no hero, simplificado)

```html
<div class="page-mock">
  <div class="page-title">Clima</div>
  <div class="page-desc">Consulte o clima de qualquer cidade</div>
  <div class="globe"></div>
  <div class="search-mock">
    <div class="input-mock"></div>
    <div class="btn-mock"></div>
  </div>
  <div class="weather-card-mock">
    <div class="stats-mock">
      <div class="bar w60"></div>
      <div class="bar w40"></div>
      <div class="bar w80"></div>
    </div>
  </div>
</div>
```

## Fidelidade

Este mockup é um *norte* de layout e posicionamento — o globo real é renderizado via
`react-globe.gl` (WebGL/Three.js), não o círculo estático mostrado aqui. A fidelidade final
(textura de globo, iluminação, animação de câmera) é construída na task de implementação.
