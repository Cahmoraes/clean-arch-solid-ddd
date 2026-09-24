# Check-ins: Direção Noite neon

Norte aprovado no companion (`inner-screens-noite-neon`). Não é pixel-final. Tokens: ver `replaced-visual-redesign-visual.md`.

## Layout (estrutura atual mantida)

- Cabeçalho admin: eyebrow "Admin", título "Check-ins", subtítulo. Membro: título "Histórico de check-ins" sem eyebrow.
- Filtro segmentado: Todos, Pendentes, Aprovados, Rejeitados, com contagens.
- Linha com busca "Buscar por academia..." e botão de ordenação ("Mais recentes" / "Mais antigos").
- Lista de itens e paginação numerada.

## Decisões visuais

- Item: cartão com chip de ícone à esquerda, nome da academia, "Realizado em dd/mm/aaaa, hh:mm", horário em mono à direita e ações.
- Status só pelo chip (sem badge de texto): validado ✓ verde, pendente ◷ âmbar, rejeitado ✕ vermelho, sempre sobre fundo suave.
- Ações (admin): Aprovar em magenta (ação primária), Rejeitar em vermelho suave; pendente mostra as duas, validado só Rejeitar, rejeitado nenhuma.
- Filtro ativo com contorno ciano; paginação com página ativa em ciano.
- Sem arte pixel nesta tela.

```html
<div class="card ci"><span class="chip">◷</span><div class="grow">nome + data</div><span class="mono">07:42</span><span class="ic">✓</span><span class="ic">✕</span></div>
```

## Fonte de design original

Nenhuma; layout definido via mockup do companion.

## Fidelidade

Norte; fidelidade final conferida no navegador.
