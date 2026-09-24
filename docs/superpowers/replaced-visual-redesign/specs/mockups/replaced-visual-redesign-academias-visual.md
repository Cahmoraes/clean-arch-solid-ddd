# Academias: Direção Noite neon

Norte aprovado no companion (`inner-screens-noite-neon`). Não é pixel-final. Tokens: ver `replaced-visual-redesign-visual.md`.

## Layout (estrutura atual mantida)

- Cabeçalho: eyebrow "Rede", título "Academias", subtítulo; ação "+ Cadastrar" (admin), em magenta.
- Linha de busca: campo "Buscar academia por nome", botão "Buscar" e alternador de visão (cards/lista) à direita.
- Grade de cards `auto-fill minmax(280px, 1fr)` com gap 18px; visão em lista alternativa; paginação numerada.

## Decisões visuais

- Card: capa de 140px com badge de status no canto superior esquerdo, botão editar (admin) no superior direito, corpo com título em Space Grotesk, descrição, localização e rodapé com telefone (ou "Ver detalhes") e pílula "Check-in" em ciano.
- Badges: Disponível verde; Desativada (admin) vermelho.
- **Arte pixel:** a skyline da capa entra apenas como fallback de capa quando a academia não tem imagem (decisão aprovada); com imagem, a imagem prevalece. O estado vazio ("Nenhuma academia encontrada") usa `PixelScene` com cena `empty`, com feixes ciano e magenta.
- Hover do card: elevação e anel em ciano.

```html
<div class="card gy"><div class="cv">/* imagem ou PixelScene scene="empty" como fallback */</div><div class="bdy">título, descrição, localização, rodapé</div></div>
```

## Fonte de design original

Nenhuma; layout definido via mockup do companion.

## Fidelidade

Norte; fidelidade final conferida no navegador.
