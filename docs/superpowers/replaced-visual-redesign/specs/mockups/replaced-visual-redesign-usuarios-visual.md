# Admin / Usuários: Direção Noite neon

Norte aprovado no companion (`inner-screens-noite-neon`). Não é pixel-final. Tokens: ver `replaced-visual-redesign-visual.md`.

## Layout (estrutura atual mantida)

- Cabeçalho: eyebrow "Admin" (ciano, mono), título "Usuários", subtítulo. Sem ação.
- Filtro segmentado de largura total: Todos, Membros, Administradores, Ativos, Inativos, cada um com contagem. Item ativo com contorno ciano.
- Busca de largura total: "Buscar por nome ou e-mail...".
- Duas colunas em `lg`: lista (~40%) e painel de detalhes (~60%).

## Decisões visuais

- Linha de usuário: cartão com faixa lateral de 3px na cor do status; selecionada com contorno e fundo ciano suave.
- Badges de status mantêm cores semânticas: Ativo verde, Bloqueado âmbar, Inativo vermelho. Admin em magenta suave; Membro neutro.
- Painel: avatar grande com iniciais em magenta, nome, e-mail em mono, badges, abas Detalhes/Permissões/Atividade (aba ativa em ciano), lista de campos e rodapé com editar e "Mais ações".
- Ciano marca seleção e filtro ativo; magenta só em ação primária.
- Sem arte pixel nesta tela.

```html
<div class="ug"><ul>/* urow: checkbox, avatar, nome+email(mono), RoleBadge, StatusBadge */</ul><aside class="card">/* avatar, tabs, dl, footer */</aside></div>
```

## Fonte de design original

Nenhuma; layout definido via mockup do companion.

## Fidelidade

Norte; fidelidade final conferida no navegador.
