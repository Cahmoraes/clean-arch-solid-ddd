# Calendário: redesign com painel do dia e gaveta (norte visual)

Norte visual da rota `/calendario`, aprovado em conversa: opção B (grade com marcadores + painel do dia selecionado) combinada com a gaveta da opção C para criar e editar a nota. É um norte, não o pixel final: a fidelidade final é construída na implementação contra o tema "Noite neon" real.

**Fonte de design original:** nenhuma. Layout definido via mockup do companion, partindo do screenshot do estado atual fornecido pelo usuário (outubro de 2026, dia 12 com feriado e nota, dia 17 como hoje).

## Intenção

- A célula do dia deixa de carregar texto. O texto do feriado e da nota sai dela e passa para o painel e para um tooltip. A célula mostra só o número e marcadores.
- A lateral deixa de crescer com o número de notas. O painel tem altura igual à da grade e a lista do mês rola por dentro.
- Criar e editar a nota acontece numa gaveta, não num modal centralizado.

## Layout (≥ 1280px)

- Duas colunas: card da grade (`minmax(0,1fr)`) e card do painel (largura fixa de cerca de 300px, mantendo `gap-6` do grid atual).
- Abaixo de 1280px o painel desce para baixo da grade (coluna única).
- Cabeçalho da página, navegação de ano e botão Hoje não mudam.

## Célula do dia (modo compacto)

- Altura mínima próxima de 68px, conteúdo centralizado: número em VT323 18px e, abaixo, a linha de marcadores.
- Marcadores (8-9px, `aria-hidden`, o significado vai no `aria-label` da célula):
  - quadrado âmbar (`warning`) = feriado;
  - losango ciano (`accent`, quadrado girado 45 graus) = nota;
  - os dois podem coexistir na mesma célula.
- Estados da célula (inalterados): hoje = `border-primary bg-primary/10`; feriado = `border-warning bg-warning/10`; hoje + feriado = hoje prevalece.
- Dia selecionado: anel duplo de foco (`0 0 0 2px background, 0 0 0 4px accent`), distinto do anel de foco de teclado (`foreground`).
- Chanfro de 6px nas células e nos botões, 12px nos cards. Sem `rounded-full`.

## Painel do dia (card à direita)

Estrutura, de cima para baixo:

1. Cabeçalho: data por extenso em VT323 30px ("12 de outubro"), dia da semana em `text-muted-foreground`, chip "selecionado".
2. Bloco de feriado (só quando existe): borda esquerda âmbar de 3px, rótulo "FERIADO NACIONAL" em 10px caixa alta, nome em negrito.
3. Bloco de nota: borda esquerda ciano de 3px, rótulo "NOTA DO DIA", texto da nota, botões `Editar` e `Excluir` (sm). Sem nota: texto "Nenhuma nota neste dia." e botão primário `Adicionar nota`.
4. Rótulo "No mês · N feriado(s) · N nota(s)".
5. Lista do mês (flex-1, `min-h-0`, rolagem interna, gradiente de fade no fim): linhas cronológicas com chip de data em VT323 15px e texto em uma linha com reticências. Linha de feriado com borda esquerda âmbar, linha de nota com borda esquerda ciano. Cada linha é um botão que seleciona o dia.

## Gaveta de edição (Sheet, lado direito)

- Abre por cima do painel, com o fundo escurecido (`bg-black/40`).
- Título com a data ("12 de outubro"), subtítulo com dia da semana e, se houver, o nome do feriado.
- Rótulo "Nota do treino", textarea (JetBrains Mono, 13-16px, até 500 caracteres) com contador `n/500`.
- Rodapé: `Salvar` (primário), `Cancelar` (outline), `Excluir` (destrutivo, só em edição). `Repetir` (outline) só após erro de rede ao salvar.
- Abaixo de 768px a gaveta sobe pela base (`side="bottom"`).

## Tokens aplicados (de `apps/frontend/src/app/globals.css`)

| Token | Escuro | Claro |
|---|---|---|
| background | `#0a1424` | `#f3f6fa` |
| card | `#0d1b2e` | `#ffffff` |
| muted | `#101f36` | `#e8eef5` |
| border | `#16304d` | `#d5dfea` |
| muted-foreground | `#9db4cc` | `#4a5f78` |
| primary | `#ff3ea5` | `#cc0077` |
| accent | `#3ee0ff` | `#006c85` |
| warning | `#ffb443` | `#9a5b00` |
| destructive | `#ff5a4d` | `#c4281c` |

Tipografia: VT323 (`font-display`, mínimo 15px) para títulos, números e chips de data; Inter para texto corrido; 10-11px apenas em rótulos caixa alta. Só tokens semânticos, sem cor literal nova.

## Markup representativo (norte)

```html
<!-- célula compacta: hoje + feriado + nota -->
<button type="button" data-date="2026-10-12"
  class="relative flex min-h-16 w-full flex-col items-center justify-center gap-2 rounded-md border border-warning bg-warning/10 p-1 focus-ring-duplo"
  aria-label="12 de outubro: Nossa Senhora Aparecida, feriado nacional de 2026, nota: treino com os irmãos">
  <span class="font-display text-lg leading-none">12</span>
  <span class="flex h-2.5 items-center gap-2" aria-hidden="true">
    <i class="block size-2 bg-warning"></i>
    <i class="block size-2 rotate-45 bg-accent"></i>
  </span>
</button>

<!-- bloco de nota do painel -->
<div class="flex flex-col gap-1 rounded-md border-l-[3px] border-accent bg-muted px-3 py-2">
  <small class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nota do dia</small>
  <p class="text-sm">treino com os irmãos</p>
  <div class="mt-1 flex gap-2">
    <button class="...btn outline sm">Editar</button>
    <button class="...btn destructive sm">Excluir</button>
  </div>
</div>
```

O restante (cards, botões, chips de data) usa os componentes existentes (`Card`, `Button`, `Sheet`, `AlertDialog`) e as classes já presentes em `monthly-calendar.tsx`, `holiday-list.tsx` e `training-notes-list.tsx`.

## Estados mostrados no mockup

1. Dia selecionado (12) com feriado e nota: painel completo e lista do mês rolando.
2. Gaveta aberta para editar a nota do dia 12.
3. Dia sem nota (19): painel com "Nenhuma nota neste dia." e `Adicionar nota`.
