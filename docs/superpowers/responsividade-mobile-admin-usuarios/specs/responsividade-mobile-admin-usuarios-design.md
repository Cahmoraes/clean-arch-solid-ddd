---
created_at: "2026-08-06T09:03:07-03:00"
updated_at: "2026-08-06T09:03:07-03:00"
---

# Responsividade Mobile — Usuários (Admin) — Design

## Visão Geral

Três ajustes de responsividade mobile na rota `/admin/usuarios`, todos puramente visuais/CSS, sem lógica de negócio:

1. **Modal de edição/detalhes de usuário sem margem lateral** — em telas pequenas o card encosta nas bordas esquerda/direita.
2. **Busca inacessível abaixo de 560px** — o `SearchBar` do header some por completo nessa faixa, sem substituto, tornando o Command Palette inalcançável.
3. **Switch de tema ocupa espaço demais no mobile** — para caber um ícone de busca no header em telas pequenas, o `ThemeToggle` ganha uma variante compacta (botão redondo) abaixo de 560px.

Escopo: **frontend-only**, sem mudança de backend, dado ou dependência nova. `dialog.tsx` é compartilhado por outros consumidores (overlay de imagem de academia, modal de editar perfil) e a mudança nele é neutra em telas largas.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade mobile | Busca e modal são inacessíveis/quebrados hoje em telas ≤560px, bloqueando fluxo do admin no celular | Busca abre o Command Palette em qualquer largura ≤560px; modal tem ≥16px de respiro lateral em qualquer largura |
| Consistência visual | O fix do modal deve ser neutro em telas onde hoje já funciona | Nenhuma mudança visual do `Dialog` em viewports onde `max-w-*` já é o fator limitante (checado nos 3 consumidores existentes) |
| Manutenibilidade | Reaproveitar padrão CSS-only já usado no projeto (`max-[560px]:hidden`), sem introduzir hook de media query novo | Diff restrito a variantes/props em componentes existentes; zero libs novas |

**Consideradas, não priorizadas:** performance (mudança é CSS puro, sem impacto mensurável), i18n (fora de escopo, nenhum texto novo).

## Especificação Visual

**Artefato curado:** `mockups/responsividade-mobile-admin-usuarios-visual.md`

**Fonte de design original:** Nenhuma; layout definido via mockup do companion visual desta sessão, a partir de screenshots reais do app enviados pelo usuário.

**Decisões visuais (norte, não pixel-final):**
- Header <560px: `SearchBar` completo continua escondido; adicionado botão só-ícone (lupa) no lugar. `ThemeToggle` ganha variante compacta (botão redondo ~36px, ícone único, sem thumb deslizante) na mesma faixa.
- Modal: card ganha 16px de respiro lateral via `w-[calc(100%-2rem)]` no `DialogContent` base, sem breakpoint extra.
- Ambas as trocas de header seguem o padrão CSS-only já existente no projeto (duas instâncias alternadas por classe, sem JS de media query).

**Fidelidade:** o mockup é um *norte* — dimensões exatas seguem os tokens dos componentes reais na implementação.

## Estrutura de Componentes

Nenhum componente novo. Quatro arquivos existentes, todos com alteração cirúrgica (prop/variante, sem nova camada de abstração):

| Arquivo | Mudança |
|---|---|
| `apps/frontend/src/components/ui/dialog.tsx` | `DialogContent`: troca `w-full` por `w-[calc(100%-2rem)]` (sem breakpoint condicional — o `max-w-*` de cada consumidor já assume controle em telas largas) |
| `apps/frontend/src/components/ui/search-bar.tsx` | Nova prop `compact?: boolean`: quando `true`, renderiza só o botão-ícone (lupa) reaproveitando o `onActivate` já existente, sem input/placeholder/atalho `⌘K` |
| `apps/frontend/src/components/ui/theme-toggle.tsx` | Nova prop `compact?: boolean`: quando `true`, renderiza botão redondo (~36px, `rounded-full bg-accent`) com o ícone sol/lua do tema atual, mesma lógica `useTheme`/`setTheme`, sem o trilho/pill deslizante |
| `apps/frontend/src/components/layout/authenticated-shell.tsx` | Header: duas instâncias de `SearchBar` (padrão `max-[560px]:hidden` / compacto `hidden max-[560px]:flex`) e duas de `ThemeToggle` (mesmo padrão), no lugar da instância única atual de cada |

## Decisões Arquiteturais

### D1. Fix do modal no componente base `dialog.tsx`, não no consumidor

- **Contexto:** o bug (sem margem lateral) está no `DialogContent` base, usado por todos os modais do app — não é específico do modal de usuários.
- **Decisão:** corrigir em `dialog.tsx`.
- **Justificativa técnica:** fonte única do problema; corrigir na base resolve para todos os consumidores de uma vez, sem duplicar a correção em cada `className` de override.
- **Justificativa de negócio:** menor custo total — evita ter que repetir o mesmo fix (e re-descobrir o mesmo bug) nos outros 2 consumidores conhecidos do `Dialog`.
- **Trade-offs aceitos:** blast radius maior (qualquer modal do app muda); mitigado por ser uma mudança visualmente neutra em telas largas (só adiciona respiro onde hoje não existe).

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
| `w-[calc(100%-2rem)]` alterar visualmente os outros 2 consumidores do `Dialog` (overlay de imagem de academia, editar perfil) em telas onde hoje já "funcionava por acidente" | 2 | 2 | 4 🟡 | Checar visualmente os 3 consumidores conhecidos do `Dialog` em telas pequenas e largas antes de fechar a task; mudança é aditiva (só adiciona respiro), não deveria remover nada existente |
| Testes existentes de `theme-toggle.test.tsx` / `search-bar.test.tsx` / `authenticated-shell.test.tsx` dependerem do markup atual (uma única instância de cada componente no header) | 2 | 3 | 6 🟡 | Atualizar os testes para considerar as duas instâncias (completa/compacta) como parte da mesma task, igual já foi feito na feature `theme-toggle-icon-only` |
| Duas instâncias de `SearchBar`/`ThemeToggle` montadas simultaneamente no DOM (uma escondida via CSS) causarem side-effect duplicado (ex. listener, analytics) | 1 | 1 | 1 🟢 | Ambos os componentes são stateless/apresentacionais hoje (sem `useEffect` com side-effect global conhecido); confirmar na implementação |

## Testes

- `dialog.tsx`: teste existente de renderização não deve quebrar (mudança é só classe CSS); adicionar/ajustar teste que verifica a classe `w-[calc(100%-2rem)]` presente no `DialogContent`.
- `theme-toggle.tsx`: cobrir a variante `compact` — renderiza botão redondo, alterna tema no clique, `aria-label` reflete o estado (mesmo padrão de acessibilidade da variante completa).
- `search-bar.tsx`: cobrir a variante `compact` — renderiza só o botão-ícone, dispara `onActivate` no clique.
- `authenticated-shell.test.tsx`: ajustar para as duas instâncias de cada componente (completa + compacta) coexistindo no DOM.
- Verificação manual em 414px (iPhone), 560px (limiar do breakpoint) e ≥768px (desktop, sem regressão).
