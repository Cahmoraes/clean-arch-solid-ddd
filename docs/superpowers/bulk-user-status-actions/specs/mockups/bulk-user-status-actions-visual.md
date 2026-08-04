# Mockup aprovado — Seleção em massa na listagem de usuários

## Decisão

Entre duas variantes comparadas via visual companion (checkbox + barra fixa no rodapé vs.
barra substituindo a área de busca/filtro no topo), a **Opção A** foi aprovada: checkbox
dentro de cada card da lista, com uma barra de ações fixa (`sticky`) no rodapé que só
aparece quando há 1+ usuário selecionado.

## Layout e hierarquia

- A lista mantém o formato atual de cards em `<ul>`/`<li>` (`UserRow`) — não vira uma
  data-table.
- Um checkbox de "selecionar página" no topo da lista, com estado indeterminado quando a
  seleção é parcial.
- Cada `UserRow` ganha um checkbox à esquerda do avatar. Quando marcado, o card recebe um
  destaque sutil (borda/realce), reaproveitando o mesmo padrão visual já usado no estado
  `isSelected` do card (borda `--accent`, fundo `accent/40` translúcido).
- A barra de ações fica ancorada ao rodapé da lista (`position: sticky; bottom`), mostrando
  a contagem de selecionados e os botões "Ativar" / "Desativar" / "Limpar seleção".
- Checkbox desabilitado (visualmente esmaecido) para usuários que o admin logado não pode
  gerenciar — mesma lógica de permissão já usada no menu "Mais ações" do painel de detalhe.

## Tokens aplicados (extraídos do tema do projeto)

- Cores: `--accent #39e58c` (destaque de seleção), `--success #2fcf80` / `--warning #ffb443`
  para os botões Ativar/Desativar, `--border #2a2a2a` / `--border-strong #3a3a3a`.
- Radius: cards `12px`/`rounded-lg`; barra de ações `--radius-md (14px)`; botões
  `--radius-sm (8px)`.
- Espaçamento: cadência de 8/16/20/24px, consistente com o `gap-2`/`gap-4`/`px-5`/`py-4`
  já usados em `UserRow`.
- Tipografia: Inter para corpo, JetBrains Mono para e-mail — sem mudança em relação ao
  padrão existente.

## Fonte de design original

Nenhuma; layout definido apenas via mockup do companion (HTML gerado a partir dos tokens do
projeto, sem Figma/wireframe externo).

## Fidelidade

Este mockup é um *norte* de layout e hierarquia, não a tela pixel-final. A fidelidade final
(componentização exata, estados de hover/focus, responsividade) é construída na task de
implementação do `BulkActionBar` e da atualização de `UserRow`.
