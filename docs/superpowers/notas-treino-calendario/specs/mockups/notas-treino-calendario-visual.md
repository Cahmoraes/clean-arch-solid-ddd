# Notas de treino no calendário — visual curado

Prosa + marcação central do mockup aprovado no companion (`layout.html`). Norte direcional, não pixel-final.

## Decisões que o mockup fixou

- Layout: grade mensal existente preservada; nota aparece dentro da célula do dia como barrinha ciano (`accent`) com ellipsis, mais losango no canto superior direito. Nada do feriado/hoje sai do lugar.
- Hierarquia: número do dia continua o elemento maior da célula; a nota é secundária; modal de edição abre abaixo do calendário com o texto e os botões Salvar / Cancelar / Excluir.
- Coexistência: dia feriado + nota mostra o nome do feriado e a barrinha da nota juntos; hoje mantém o destaque de hoje.
- Sidebar: lista "Minhas notas da semana" com um item por dia com nota (`tag` com data + texto).
- Interação: clique em dia vazio abre criar; clique na nota abre editar; Excluir abre confirmação (decisão da conversa).

## Tokens aplicados (Noite neon, vindos do relatório de design tokens)

- `background #0a1424`, `card #0d1b2e`, `surface-2 #101f36`, `foreground #dbe9f7`, `muted-fg #9db4cc`
- `primary #ff3ea5` (hoje), `warning #ffb443` (feriado), `accent #3ee0ff` (nota — terceiro estado semântico, sem reutilizar primary/warning)
- `border #16304d`; Card `rounded-xl`, célula/botão `rounded-md`; `font-display VT323` para números/títulos, `Inter` corpo, `JetBrains Mono` no textarea

## Marcação central (núcleo do layout aprovado)

```html
<div class="day selected">
  <div class="dnum">14</div>
  <div class="note-dot"></div>
  <div class="note-bar">Peito + tríceps 4×12</div>
</div>

<div class="modal">
  <h3>14 out — minha nota</h3>
  <textarea>Peito + tríceps 4x12, 60s descanso</textarea>
  <div class="row">
    <button class="btn btn-p">Salvar</button>
    <button class="btn btn-o">Cancelar</button>
    <button class="btn btn-d">Excluir</button>
  </div>
</div>
```

## Fonte de design original

Nenhuma; layout definido apenas via mockup do companion.

## Fidelidade

O mockup é um *norte*. A fidelidade final é construída na task de implementação, com os componentes reais (`Card`, `Button`, `Tooltip`, `PageContainer`), usando ferramentas de fidelidade visual do ambiente descobertas no plano.
