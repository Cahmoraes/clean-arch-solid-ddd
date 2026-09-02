---
created_at: "2026-09-02T16:52:10-03:00"
updated_at: "2026-09-02T16:52:10-03:00"
---

# Weather Globe Clima — Especificação Visual

## Decisão

Layout **"Opção A — globo hero, no topo"**: o globo 3D ocupa uma seção panorâmica entre o
título da página e o formulário de busca, antes de qualquer resultado. Rejeitada a opção
alternativa (globo compacto embutido dentro do card de resultado), por dar ao globo o
protagonismo visual desde a primeira renderização da página, mesmo sem busca ainda feita.

## Layout e hierarquia

Ordem, de cima para baixo, dentro da coluna central (`max-w-md`, a mesma da página `/clima`
hoje):

1. `<header>` — título "Consulta de clima" (`font-display`) + subtítulo.
2. **Seção do globo** (nova) — painel de altura fixa (~200px no mockup, ajustar para o
   componente real), cantos arredondados (`rounded-xl`), fundo escuro tipo "espaço" com um
   glow radial na cor primária centrado no ponto do marcador.
3. `WeatherSearchForm` (existente, inalterado) — input + botão "Consultar".
4. Resultado (`CurrentWeatherDisplay` / `EmptyState` / erro, existentes, inalterados).

## Tokens aplicados

- Cor primária / marcador / glow: `--color-primary` `#39e58c` (mesma cor de destaque usada
  em botões e outros componentes do app).
- Fundo do painel do globo: gradiente radial escuro (`#080808` → `#0c1410` → `#1c2b22`),
  consistente com o tema escuro do projeto (`--color-background` dark).
- Raio do painel: `rounded-xl` (mesmo raio de card usado em `CurrentWeatherDisplay`).
- Tipografia: sem texto próprio no painel do globo além de uma legenda opcional discreta
  (`font-sans`, `text-muted-foreground`) — a leitura da cidade/temperatura continua sendo
  responsabilidade do card de resultado existente, nunca do globo.

## Core HTML de referência (estrutura do painel, simplificado)

```html
<div class="p-globe-hero">
  <!-- canvas do react-globe.gl é montado aqui via ref, client-only -->
  <span class="pin"></span> <!-- marcador na coordenada atual -->
</div>
```

```css
.p-globe-hero {
  height: 200px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 62% 38%, rgba(57,229,140,0.55), rgba(57,229,140,0) 45%),
    radial-gradient(circle at 50% 50%, #1c2b22 0%, #0c1410 60%, #080808 100%);
}
```

A altura, a proporção e o preenchimento exatos do canvas 3D real (`react-globe.gl`) devem
ser ajustados na implementação — este bloco é a direção visual (cor, raio, posição na
página), não o pixel final.

## Fonte de design original

Nenhuma — layout definido apenas via mockup do companion (comparação lado a lado das duas
opções, aprovada nesta sessão de brainstorming).

## Fidelidade

Este artefato é um *norte*, não a tela pixel-final. A fidelidade definitiva do globo 3D
(iluminação, textura do mapa-múndi, animação de rotação) é construída na task de
implementação, usando a API real de `react-globe.gl`.
