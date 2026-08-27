# Referência visual — Paginação do histórico de atividades

## Intenção

A aba **Atividade** permanece dentro da página de perfil existente. O histórico ocupa um card de largura total, com título e legenda no cabeçalho, eventos agrupados por data no conteúdo e a navegação no rodapé. O resumo “Exibindo 1–20 de 47 atividades” fica alinhado à esquerda; os controles numerados ficam à direita. Em telas estreitas, o resumo permanece acima dos controles.

## Estrutura representativa

```html
<section class="card">
  <header class="card-header">
    <h2>Histórico de atividades</h2>
    <span>20 / página</span>
  </header>
  <div class="events">...eventos agrupados por data...</div>
  <footer class="pager">
    <span>Exibindo 1–20 de 47 atividades</span>
    <nav aria-label="Paginação">
      <button disabled>‹</button>
      <button aria-current="page">1</button>
      <button>2</button>
      <button>3</button>
      <button>›</button>
    </nav>
  </footer>
</section>
```

## Tokens aplicados

- Tema dark: fundo `#080808`, card `#161616`, superfície secundária `#1d1d1d`, borda `#2a2a2a`, texto `#f6f6f4`, texto muted `#a3a39c` e accent `#39e58c`.
- Inter para texto, Space Grotesk para títulos e JetBrains Mono para metadados.
- Card com raio de 22px e padding de 24px; controles com raio de 14px e 32px de altura; escala de espaçamento baseada em 4px.
- Paginação numerada reutiliza o padrão `NumberedPagination`; controles ficam ocultos quando há uma única página.

## Fonte e fidelidade

Fonte original: nenhuma; a direção foi definida no mockup do companion visual.

Este artefato é um norte visual, não uma especificação pixel-final. A implementação deve preservar a hierarquia, os tokens e o comportamento responsivo aprovados, usando os componentes reais do projeto.
