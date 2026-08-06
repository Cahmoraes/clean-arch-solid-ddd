---
created_at: "2026-08-06T09:03:07-03:00"
updated_at: "2026-08-06T11:45:49-03:00"
---

# Responsividade Mobile — Usuários (Admin) — Design

## Visão Geral

Três ajustes de responsividade mobile na rota `/admin/usuarios`, todos puramente visuais/CSS, sem lógica de negócio:

1. **Modais sem margem lateral** — em telas pequenas os cards de `Dialog` (detalhes/edição de usuário) e de `AlertDialog` (confirmações de desativar/reativar/excluir usuário, ação em massa — mesmo bug, componente base independente) encostam nas bordas esquerda/direita.
2. **Busca global do header inacessível abaixo de 560px** — o `SearchBar` do header (única porta de entrada do Command Palette, junto com o atalho `⌘K`) some por completo nessa faixa, sem substituto. A busca própria da lista de usuários (`admin/usuarios/page.tsx`) já é sempre visível e não é afetada.
3. **Switch de tema ocupa espaço demais no mobile** — para caber um ícone de busca no header em telas pequenas, o `ThemeToggle` ganha uma variante compacta (botão redondo) abaixo de 560px.

Escopo: **frontend-only**, sem mudança de backend, dado ou dependência nova. `dialog.tsx` e `alert-dialog.tsx` são compartilhados por outros consumidores (overlay de imagem de academia, modal de editar perfil, diálogos de confirmação em outras telas) e a mudança neles é neutra em telas largas. Um quinto arquivo, fora de `apps/frontend`, também é tocado: um teste de aceitação já entregue da feature `global-command-palette` (`docs/superpowers/global-command-palette/qa/evidence/us-001-usurio-autenticado-abrir-um-palette/us-001-navigation-palette-open-close.acceptance.test.tsx`) precisa de um ajuste de seletor, porque esta mudança passa a montar duas instâncias de `SearchBar` simultaneamente — ver a linha correspondente em "Riscos" e a nota em "Testes".

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade mobile | A busca global do header e os modais de confirmação/detalhes ficam inacessíveis/quebrados hoje em telas ≤560px, bloqueando fluxo do admin no celular | Busca compacta abre o Command Palette em qualquer largura ≤560px e expõe nome acessível (`aria-label`) no botão; `Dialog` e `AlertDialog` têm ≥16px de respiro lateral e contenção vertical (sem conteúdo inalcançável) em qualquer largura |
| Consistência visual | O fix dos modais deve ser neutro em telas onde hoje já funciona | Nenhuma mudança visual de `Dialog`/`AlertDialog` em viewports onde `max-w-*` já é o fator limitante (checado nos consumidores existentes de ambos) |
| Manutenibilidade | Esconder por classe de breakpoint (`max-[560px]:hidden`) já é o padrão do projeto; a alternância por duas instâncias do mesmo componente (completa + compacta) é introduzida por esta mudança, no mesmo espírito CSS-only, sem hook de media query novo | Diff restrito a variantes/props em componentes existentes; zero libs novas |

**Consideradas, não priorizadas:** performance (mudança é CSS puro, sem impacto mensurável), i18n (fora de escopo — a única string nova, o `aria-label="Buscar"` do botão compacto, segue hard-coded em pt-BR como o padrão já existente no app, sem catálogo de tradução).

## Especificação Visual

**Artefato curado:** `mockups/responsividade-mobile-admin-usuarios-visual.md`

**Fonte de design original:** Nenhuma; layout definido via mockup do companion visual desta sessão, a partir de screenshots reais do app enviados pelo usuário.

**Decisões visuais (norte, não pixel-final):**
- Header <560px: `SearchBar` completo continua escondido; adicionado botão só-ícone (lupa, com `aria-label="Buscar"` — obrigatório, pois sem o placeholder visível o botão não teria nome acessível algum) no lugar. `ThemeToggle` ganha variante compacta (botão redondo ~36px, ícone único, sem thumb deslizante) na mesma faixa.
- Modal: card do `DialogContent` **e** do `AlertDialogContent` ganha 16px de respiro lateral via `w-[calc(100%-2rem)]`, sem breakpoint extra. `DialogContent` também ganha contenção vertical (`max-h-[calc(100dvh-2rem)] overflow-y-auto`) — hoje essa contenção só existe no branch desktop do consumidor de detalhes de usuário, e o painel pode estourar a viewport em telas pequenas, paisagem ou com o teclado virtual aberto.
- Esconder por classe de breakpoint (`max-[560px]:hidden`) já é o padrão CSS-only existente no projeto. A alternância por duas instâncias do mesmo componente (completa + compacta) é introduzida por esta mudança, no mesmo espírito CSS-only, sem JS de media query.

**Fidelidade:** o mockup é um *norte* — dimensões exatas seguem os tokens dos componentes reais na implementação.

## Estrutura de Componentes

Nenhum componente novo. Cinco arquivos existentes, todos com alteração cirúrgica (prop/variante, sem nova camada de abstração):

| Arquivo | Mudança |
|---|---|
| `apps/frontend/src/components/ui/dialog.tsx` | `DialogContent`: troca `w-full` por `w-[calc(100%-2rem)]` (sem breakpoint condicional — o `max-w-*` de cada consumidor já assume controle em telas largas); adiciona `max-h-[calc(100dvh-2rem)] overflow-y-auto` para conter o conteúdo verticalmente no mobile |
| `apps/frontend/src/components/ui/alert-dialog.tsx` | `AlertDialogContent`: mesma troca `w-full` → `w-[calc(100%-2rem)]` — bug idêntico ao de `dialog.tsx`, componente base independente |
| `apps/frontend/src/components/ui/search-bar.tsx` | Nova prop `compact?: boolean`: quando `true`, renderiza só o botão-ícone (lupa, ~38px, com `aria-label="Buscar"` — nome acessível próprio, não herdado da instância completa) reaproveitando o `onActivate` já existente, sem input/placeholder/atalho `⌘K`. A variante compacta não herda as classes base (`h-[52px]` etc.) da variante completa |
| `apps/frontend/src/components/ui/theme-toggle.tsx` | Nova prop `compact?: boolean`: quando `true`, renderiza botão redondo (~36px, `rounded-full bg-accent`) com o ícone sol/lua do tema atual, mesma lógica `useTheme`/`setTheme`, sem o trilho/pill deslizante |
| `apps/frontend/src/components/layout/authenticated-shell.tsx` | Header: duas instâncias de `SearchBar` (padrão `max-[560px]:hidden` / compacto `hidden max-[560px]:flex`) e duas de `ThemeToggle` (mesmo padrão), no lugar da instância única atual de cada |

## Decisões Arquiteturais

### D1. Fix do modal nos componentes base `dialog.tsx` e `alert-dialog.tsx`, não nos consumidores

- **Contexto:** o bug (sem margem lateral) existe em **dois** componentes base independentes, não um só — `DialogContent` (usado pelo modal de detalhes/edição de usuário) e `AlertDialogContent` (usado pelos diálogos de confirmação da mesma rota: desativar/reativar/excluir usuário, ação em massa). Cada um implementa seu próprio `fixed ... w-full`; não há uma fonte única. Além da margem lateral, `DialogContent` também não tem contenção vertical (`max-h`/`overflow`) no branch mobile — o painel de detalhes de usuário pode estourar a viewport em telas pequenas, paisagem ou com o teclado virtual aberto.
- **Decisão:** corrigir a margem lateral em ambos os componentes base (`dialog.tsx` e `alert-dialog.tsx`); corrigir a contenção vertical apenas em `dialog.tsx` (é o único dos dois com conteúdo longo o bastante para justificar o risco — os diálogos de confirmação são curtos).
- **Justificativa técnica:** corrigir nas duas bases resolve para todos os consumidores de cada família de uma vez, sem duplicar a correção em cada `className` de override individual.
- **Justificativa de negócio:** menor custo total — evita ter que repetir o mesmo fix (e re-descobrir o mesmo bug) nos consumidores individuais de `Dialog` e de `AlertDialog`.
- **Trade-offs aceitos:** blast radius maior ainda (dois componentes base, não um; qualquer modal ou diálogo de confirmação do app muda); mitigado por ser uma mudança visualmente neutra em telas largas (só adiciona respiro/contenção onde hoje não existe).

### D2. `w-[calc(100%-2rem)]` sem breakpoint `sm:` condicional

- **Contexto:** a correção poderia usar `w-[calc(100%-2rem)] sm:w-full` (respiro só abaixo de 640px) ou `w-[calc(100%-2rem)]` incondicional.
- **Decisão:** incondicional — sem `sm:`.
- **Justificativa técnica:** `width` e `max-width` competem nativamente no CSS (o menor vence); em qualquer viewport onde o `max-w-lg`/`max-w-2xl` do consumidor já for menor que `calc(100%-2rem)`, o `max-w-*` governa sozinho — o respiro só passa a existir exatamente quando a viewport é pequena o bastante para precisar dele. Evita um segundo breakpoint mágico e um gap de telas intermediárias (ex. 640-704px com `max-w-2xl`) onde a versão condicional ainda encostaria nas bordas.
- **Justificativa de negócio:** menos uma decisão de breakpoint para manter/documentar.
- **Trade-offs aceitos:** nenhum identificado — é estritamente mais correto que a alternativa condicional.

### D3. Prop `compact` nos componentes existentes, sem duplicar em novos componentes

- **Contexto:** a variante compacta do `SearchBar` e do `ThemeToggle` poderia ser um componente novo (`SearchBarCompact`, `ThemeToggleCompact`) ou uma prop no componente existente.
- **Decisão:** prop `compact` em ambos os componentes existentes.
- **Justificativa técnica:** evita duplicar a lógica de estado (`useTheme`, `onActivate`/Command Palette) em dois lugares; um componente novo exigiria manter dois pontos de verdade sincronizados a cada mudança futura de tema/busca.
- **Justificativa de negócio:** menor superfície para manter; um bug de lógica corrigido uma vez corrige as duas variantes.
- **Trade-offs aceitos:** o componente ganha uma ramificação de render condicional (`compact ? ... : ...`); aceitável dado o tamanho pequeno de ambos os componentes.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `w-[calc(100%-2rem)]` alterar visualmente os outros consumidores do `Dialog` (overlay de imagem de academia, editar perfil, detalhes de usuário) em telas onde hoje já "funcionava por acidente" | 2 | 2 | 4 🟡 | Checar visualmente os 3 consumidores conhecidos do `Dialog` em telas pequenas e largas antes de fechar a task; mudança é aditiva (só adiciona respiro), não deveria remover nada existente |
| `AlertDialog` ter o mesmo bug de margem lateral e não estar coberto pelo fix de `dialog.tsx` — critério "≥16px de respiro lateral em qualquer largura" continuaria falso nos diálogos de confirmação de `/admin/usuarios` | 2 | 3 | 6 🟡 | Aplicar a mesma troca em `alert-dialog.tsx` (ver D1); checar visualmente `BulkStatusConfirmationDialog` e os diálogos de `confirmation-dialogs.tsx` em 414px |
| `DialogContent` sem `max-h`/`overflow` — o painel de detalhes de usuário estoura a viewport em telas pequenas, paisagem ou com teclado virtual aberto, deixando conteúdo (inclusive o botão de fechar) inalcançável | 2 | 2 | 4 🟡 | Adicionar `max-h-[calc(100dvh-2rem)] overflow-y-auto` em `dialog.tsx` junto com a mudança de largura; verificar manualmente 414×896 retrato, 896×414 paisagem e com teclado virtual aberto no formulário |
| `SearchBar` compacto ficar sem nome acessível (o placeholder visível, hoje a única fonte do accessible name, é removido nesta variante) | 2 | 2 | 4 🟡 | Botão compacto recebe `aria-label="Buscar"` próprio; teste cobre `getByRole("button", { name: "Buscar" })` |
| Testes existentes de `theme-toggle.test.tsx` / `search-bar.test.tsx` / `authenticated-shell.test.tsx` dependerem do markup atual (uma única instância de cada componente no header) | 2 | 3 | 6 🟡 | Atualizar os testes para considerar as duas instâncias (completa/compacta) como parte da mesma task |
| Teste de aceitação já entregue de outra feature (`global-command-palette`, `us-001-navigation-palette-open-close.acceptance.test.tsx`) quebrar por `getByRole` ambíguo — passam a existir duas instâncias de `SearchBar` no DOM | 2 | 3 | 6 🟡 | Restringir o seletor do teste afetado à variante completa (`name: /buscar\.\.\./i`); esse arquivo roda por um harness de evidence não executável isoladamente neste ambiente (limitação pré-existente, fora deste escopo) — a correção é verificada por revisão estática |
| Duas instâncias de `SearchBar`/`ThemeToggle` montadas simultaneamente no DOM (uma escondida via CSS) causarem side-effect duplicado (ex. listener, analytics) | 1 | 1 | 1 🟢 | `SearchBar` é puramente apresentacional; `ThemeToggle` tem apenas um `useEffect` de guarda de hidratação local (`mounted`), sem side-effect global compartilhado — duplicar as instâncias é seguro; confirmar ausência de efeito duplicado como parte dos critérios de sucesso da task de wiring |

## Testes

- `dialog.tsx`: teste existente de renderização não deve quebrar (mudança é só classe CSS); adicionar/ajustar teste que verifica a presença das classes `w-[calc(100%-2rem)]` e `max-h-[calc(100dvh-2rem)] overflow-y-auto` no `DialogContent` — asserção sobre a implementação, não prova o respiro/contenção real; a validação de que o modal fica utilizável é a verificação manual abaixo.
- `alert-dialog.tsx`: mesmo tratamento — adicionar/ajustar teste que verifica `w-[calc(100%-2rem)]` presente no `AlertDialogContent`.
- `theme-toggle.tsx`: cobrir a variante `compact` — renderiza botão redondo, alterna tema no clique, `aria-label` reflete o estado (mesmo padrão de acessibilidade da variante completa).
- `search-bar.tsx`: cobrir a variante `compact` — renderiza só o botão-ícone com `aria-label="Buscar"` (nome acessível verificável via `getByRole("button", { name: "Buscar" })`), dispara `onActivate` no clique.
- `authenticated-shell.test.tsx`: ajustar para as duas instâncias de cada componente (completa + compacta) coexistindo no DOM.
- Teste de aceitação de outra feature já entregue (`global-command-palette`, `us-001-navigation-palette-open-close.acceptance.test.tsx`): ajustar o seletor `getByRole` para não colidir com a nova instância compacta do `SearchBar`. Este arquivo roda por um harness de evidence próprio, não executável isoladamente neste ambiente (limitação pré-existente, fora do escopo desta mudança) — a correção é verificada por revisão estática, não por execução automatizada.
- Verificação manual em 414px (iPhone), 560px (limiar do breakpoint — `max-[560px]` casa em exatamente 560px, então a variante compacta já aparece nessa largura; a completa volta a partir de 561px) e ≥768px (desktop, sem regressão). Incluir também 896×414 (paisagem) e o painel de detalhes de usuário com o teclado virtual aberto sobre o formulário de edição. **A alternância em 560px não tem cobertura automatizada possível** — `jsdom` não avalia media queries, então ambas as instâncias de cada componente sempre coexistem nos testes; a prova real é esta verificação manual.
