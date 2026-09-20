# Mockup curado: seletor de itens por página

## Fonte

Preview local do companion visual desta sessão. Não há fonte externa de design.

## Decisões visuais

- O seletor fica na mesma barra da paginação, próximo do resumo da lista.
- O rótulo explícito é “Itens por página”.
- As opções são `10`, `20` e `50`; `20` permanece selecionado por padrão.
- A navegação numérica continua visível e não muda de posição conceitualmente.
- Ao trocar a opção, a página volta para `1` e o resumo passa a refletir o
  `pageSize` retornado pela API.
