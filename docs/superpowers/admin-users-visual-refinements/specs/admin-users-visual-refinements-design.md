---
created_at: "2026-09-16T14:45:12-03:00"
updated_at: "2026-09-16T14:45:12-03:00"
---

# Design: Refinamentos Visuais — Listagem de Usuários (Admin)

## Visão Geral

A tela `/admin/usuarios` (feature `admin-users`) tem três problemas visuais reportados
pelo usuário, com print de cada um: (1) os badges "Membro" e "Ativo/Inativo" no card de
cada usuário ficam lado a lado e espremem o espaço disponível; (2) o item em destaque
(aberto no painel de detalhes) e os itens apenas marcados via checkbox de seleção em
massa usam a mesma cor verde, confundindo qual está em destaque; (3) o painel de
detalhes, em telas de split-view, abre/fecha sem transição. Um quarto ponto (contraste do
e-mail sobre o fundo verde do destaque) surgiu durante a revisão do mockup do item 2 e
entrou no mesmo escopo. É um ajuste puramente apresentacional: nenhuma rota, endpoint,
schema ou regra de negócio muda.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade/legibilidade | Admins usam a lista dezenas de vezes/dia para localizar e agir sobre usuários | Nenhuma informação (papel, status, seleção) depende só de cor para ser percebida (WCAG 1.4.1) |
| Consistência visual | Painel fixo e Sheet mobile são a mesma funcionalidade em dois breakpoints | Mesma duração de transição (300ms) nos dois |
| Manutenibilidade | Token de "marcado" e variant de badge devem servir outras telas, não só esta | Nenhuma cor ou duração fica hardcoded fora de `globals.css`/props de componente |

**Consideradas, não priorizadas:** performance (mudança é só CSS/classe, sem impacto
mensurável), i18n (nenhum texto novo além do já existente).

## Especificação Visual

**Artefato curado:** `mockups/admin-users-visual-refinements-visual.md` (prosa + HTML de
referência, relativo a este spec)

**Fonte de design original:** Nenhuma; layout definido via mockup do companion, a partir
de screenshots do app real anexados pelo usuário.

**Decisões visuais (norte, não pixel-final):**
- Status do usuário vira faixa de 3px na borda esquerda do card (cor por tom), badge de
  papel continua como único pill visível.
- Destaque (aberto no painel) mantém verde accent atual; apenas marcado usa novo token
  neutro `--color-selected-tint` (sem matiz de cor).
- E-mail sobe de `--color-subtle` para `--color-muted-foreground` só no estado de
  destaque.
- Painel fixo do split-view ganha fade + translateY/scale em 300ms ease-in-out; Sheet
  mobile mantém a transição Radix já existente, sem mudança.

**Fidelidade:** o mockup é um norte de layout/cor/timing; a fidelidade final é construída
na implementação, contra os tokens e componentes reais do tema.

## Estrutura de Componentes

- `StatusBadge` (`apps/frontend/src/components/ui/status-badge.tsx`) ganha uma prop
  `variant` (`"pill"` default, `"stripe"` novo) — no modo `stripe`, renderiza sem marcação
  própria e expõe a cor de tom para o container aplicar como `border-left`, mais um
  `<span class="sr-only">` com o label do status.
- `UserRow` (`apps/frontend/src/features/admin/components/user-row.tsx`) passa a: (a)
  usar `StatusBadge variant="stripe"` e aplicar a borda esquerda no `<li>`; (b) separar a
  classe de fundo em duas ramificações independentes — `isSelected` (destaque, verde
  accent) e `checked && !isSelected` (marcado, `--color-selected-tint`) — em vez do
  booleano único `isHighlighted` atual; (c) aplicar `text-muted-foreground` no e-mail
  condicionalmente a `isSelected`.
- Novo wrapper `AnimatedPanel` (`apps/frontend/src/components/ui/animated-panel.tsx`):
  componente pequeno que aplica `opacity`/`transform` de entrada/saída (300ms
  ease-in-out) ao filho, controlado por uma prop `open: boolean`. Reutilizável por outros
  painéis fixos que venham a precisar do mesmo padrão.
- `DesktopView` (`user-detail-container.tsx`) passa a envolver o painel de detalhes com
  `AnimatedPanel`. `MobileView`/`Sheet` não muda.
- `globals.css`: novo token `--color-selected-tint` no bloco `@theme` (light e dark),
  valor igual a `--color-surface-2` (sem matiz nova) — mantém o número de decisões de cor
  centralizado no tema em vez de hardcoded em `user-row.tsx`.

## Decisões Arquiteturais

### D1. Status como faixa lateral em vez de segundo pill

- **Contexto:** dois pills (papel + status) lado a lado espremem o espaço num card já
  estreito (coluna `minmax(0,0.4fr)` do grid).
- **Decisão:** status vira indicador de borda esquerda (3px, cor por tom) + texto
  acessível; papel continua como pill textual único.
- **Justificativa técnica:** libera 100% da largura antes ocupada pelo segundo pill sem
  introduzir wrapping/overflow condicional.
- **Justificativa de negócio:** admins escaneiam a lista rapidamente; nome/e-mail e o
  papel (crítico para permissão) ganham mais espaço de leitura.
- **Trade-offs aceitos:** status fica menos "escaneável" à primeira vista que um pill
  textual — mitigado com `aria-label`/texto para leitor de tela e a cor por tom já
  estabelecida (verde/âmbar/vermelho).

### D2. Novo token `--color-selected-tint` em vez de reaproveitar `--color-primary`

- **Contexto:** `--color-primary` e `--color-accent` são o mesmo verde (`#39e58c`) neste
  tema — reaproveitar "primary" para o estado "marcado" não geraria contraste nenhum
  contra o destaque.
- **Decisão:** adicionar um token neutro (`--color-selected-tint`, igual a
  `--color-surface-2`) só para o estado "apenas marcado".
- **Justificativa técnica:** contraste vem da ausência de matiz de cor, não de uma nova
  cor — menor risco de colidir com qualquer semântica de cor futura (status, avisos).
- **Justificativa de negócio:** usuário validou esta direção no preview visual
  interativo (Opção A, recomendada) entre 3 alternativas.
- **Trade-offs aceitos:** distinção puramente por saturação/brilho é mais sutil que uma
  nova cor viva (Opção B testada e descartada) — aceitável porque o checkbox marcado já
  carrega o sinal primário de "está marcado".

### D3. Transição do painel fixo alinhada em duração ao Sheet mobile (300ms)

- **Contexto:** painel fixo (desktop) não tinha transição; Sheet mobile já usa
  300ms/500ms via Radix `animate-in`/`animate-out`.
- **Decisão:** `AnimatedPanel` usa 300ms `ease-in-out`, `opacity` + `transform`
  (`translateY`/`scale`), sem animar largura.
- **Justificativa técnica:** `opacity`/`transform` são compositáveis por GPU, evitam
  reflow; 300ms alinha com a duração de abertura do Sheet.
- **Justificativa de negócio:** usuário testou ao vivo no preview e confirmou a duração
  consistente entre os dois breakpoints (Opção B).
- **Trade-offs aceitos:** nenhum — mudança aditiva, sem remoção de comportamento
  existente.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Novo token de cor não aplicado nos dois temas (light/dark) | 2 | 1 | 2 🟢 | Definir `--color-selected-tint` explicitamente nos dois blocos `@theme`, testado visualmente nos dois temas |
| `StatusBadge variant="stripe"` quebra outros consumidores do componente que ainda esperam o pill | 2 | 2 | 4 🟡 | `variant` com default `"pill"` preserva comportamento atual; `grep` por todo uso de `StatusBadge` antes de mudar a prop |
| Separar `isSelected`/`checked` em `UserRow` introduz regressão de acessibilidade (ex.: anúncio aria-live já corrigido em commit recente) | 2 | 2 | 4 🟡 | Reexecutar os testes existentes de `user-row.test.tsx`/a11y antes de fechar a task |

## Testes

Runner: Vitest. Comando estreito (um arquivo coletado), de dentro de `apps/frontend`:
`pnpm exec vitest run <arquivo>` — o script `pnpm test -- --run <arquivo>` do pacote não
estreita, coleta a suíte inteira. Framework: Next.js + React Testing Library.

- `status-badge.test.tsx`: cobrir o novo `variant="stripe"` (renderiza borda + texto
  acessível, sem pill) mantendo os casos existentes do `variant="pill"`.
- `user-row.test.tsx`: cobrir os três estados de fundo (normal, destaque, apenas
  marcado) como classes/estilos distintos, e o e-mail em `muted-foreground` só no
  destaque.
- `animated-panel` (novo): teste unitário simples de que a classe/estilo de entrada muda
  conforme a prop `open`.
- Manual/QA visual: confirmar nos dois temas (light/dark) e nos dois breakpoints
  (split-view desktop e Sheet mobile) contra o mockup curado.
