---
created_at: "2026-09-05T09:51:43-03:00"
updated_at: "2026-09-05T09:51:43-03:00"
---

# Mockup — Textura e tamanho do globo (revisão 2026-09-05)

**Decisões visuais aprovadas nesta revisão** (companion local, sessão de brainstorming):

1. **Textura do globo:** mapa-múndi realista (`earth-dark.jpg`, textura oficial do
   `three-globe`) em vez da esfera sólida sem continentes da versão original. Comparado
   contra uma alternativa de vetor estilizado (linhas finas na cor primária); o usuário
   escolheu a textura realista.
2. **Tamanho:** globo aumenta de 128px para 240px, para dar área de arrasto suficiente à
   rotação manual (D5.1/D6 do design doc). Validado dentro da coluna `max-w-md` (448px) da
   página `/clima` — cabe sem alterar a largura do layout, só a altura reservada ao globo.

## Estrutura da página (norte, não pixel-final)

Coluna central `max-w-md`, elementos empilhados com `gap-8` (inalterado):

```
[ h1 "Consulta de clima" (font-display) ]
[ WeatherGlobe — 240×240px, centralizado, textura earth-dark.jpg ]
[ WeatherSearchForm — input + botão inline ]
[ Resultado: EmptyState | erro | CurrentWeatherDisplay ]
```

## Design tokens aplicados

- Fundo do globo: gradiente radial existente `#123a2c → #061410 → #020403`
  (`GLOBE_BACKGROUND_STYLE`, inalterado).
- Textura: `earth-dark.jpg` (tons escuros/acinzentados) sobre o `globeMaterial` sólido
  (`#061410`) como base — compatível com o fundo dark do app (`--color-background: #080808`)
  sem contraste forte.
- Marcador: `#39e58c` (`--color-primary`), inalterado.
- Fonte: `--font-display` (Space Grotesk) nos títulos, inalterado — o globo em si não tem
  texto.

## Fidelidade

Norte de direção, não pixel-final: a renderização real é `react-globe.gl` (WebGL) com
`globeImageUrl` apontando para a textura definida em D1 revisado. Cores exatas e posição
de continentes seguem a textura oficial do `three-globe`, não o SVG ilustrativo do mockup.

## Fonte de design original

Nenhuma — layout definido via mockup do companion nesta sessão, evoluindo o mockup
original de `weather-globe-clima-visual.md`.
