---
created_at: "2026-07-02T10:16:27-03:00"
updated_at: "2026-07-02T10:16:27-03:00"
---

# Theme Toggle Icon Only — Design

## Visão Geral

O `ThemeToggle` no header autenticado (`apps/frontend/src/components/ui/theme-toggle.tsx`) hoje exibe os textos "Claro"/"Escuro" ao lado dos ícones `Sun`/`Moon`, escondendo o texto apenas abaixo de 860px. Esta feature remove o texto em todas as larguras — os ícones passam a comunicar o estado sozinhos — e adiciona uma transição leve ao próprio ícone durante a troca de tema, além da animação de slide do pill que já existe.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade visual | Toggle mais compacto e limpo no header, consistente em qualquer largura de tela | Pill reduz de 128px para ~64px; sem layout shift em nenhum breakpoint |
| Acessibilidade | Remover o texto visível não pode remover o nome acessível do controle | `aria-label` descreve a ação e o estado atual, verificável via testing-library `getByRole("button", { name: ... })` |
| Manutenibilidade | Mudança cirúrgica em um componente já existente, sem introduzir novas dependências | Diff restrito a `theme-toggle.tsx` (+ teste); zero libs novas |

**Consideradas, não priorizadas:** performance (componente já é trivial, sem impacto mensurável), i18n (rótulo do toggle não passa por catálogo de tradução hoje, fora de escopo).

## Estrutura de Componentes

Nenhum componente novo. Alteração isolada em `ThemeToggle` (`apps/frontend/src/components/ui/theme-toggle.tsx`):

- Remove os dois `<span>` de texto fixo ("Claro"/"Escuro") e o `<span>{activeLabel}</span>` dentro do pill ativo.
- Remove a lógica de breakpoint `max-[860px]:hidden` associada ao texto — o componente passa a ser sempre compacto.
- Reduz a largura do pill (`w-[128px]` → `w-16`), mantendo altura (`h-[38px]`) e a transição de slide do thumb (`transition-[left] duration-300`) já existente.
- Adiciona uma transição leve no ícone dentro do thumb (fade + rotate curto, ~150-200ms) na troca — hoje o ícone é apenas substituído via lookup em `THEME_CONFIG` sem transição própria.
- Mantém/reforça `aria-label` no botão, já que ele passa a ser a única forma de comunicar o estado para tecnologia assistiva.
- Respeita `prefers-reduced-motion`: quando o usuário preferir menos movimento, a transição do ícone (e idealmente o slide do thumb) deve ser suprimida ou reduzida a um crossfade instantâneo — via Tailwind `motion-reduce:transition-none` ou equivalente.

## Especificação Visual

**Artefato curado:** `mockups/theme-toggle-icon-only-visual.md` (prosa + core HTML/CSS, relativo a este spec)

**Fonte de design original:** Nenhuma; layout definido apenas via mockup do companion visual desta sessão de brainstorming (3 variantes comparadas).

**Decisões visuais (norte, não pixel-final):**
- Layout: pill único sempre compacto (~64px), sem breakpoint especial — hoje só colapsava abaixo de 860px.
- Thumb mantém o slide horizontal já existente (`left` transition, ~300ms).
- Ícone dentro do thumb ganha transição própria leve (fade/rotate, ~150-200ms) na troca, além do slide do container.
- Tokens: cores/acentos do design system atual (`--color-accent`, `--color-surface-2`, `--color-border`), sem novos tokens.

**Fidelidade:** o mockup é um *norte* — tamanhos e easing exatos são ajustados durante a implementação diretamente no componente real.

## Decisões Arquiteturais

| Decisão | Justificativa | Trade-offs aceitos |
|---|---|---|
| Manter mecânica de slide do pill (variante A) em vez de trocar para botão circular com rotação/morph | Reaproveita animação já testada em produção (`transition-[left] duration-300`); menor risco de regressão visual | Perde o efeito mais "vivo" das variantes B/C; toggle continua com formato de pill em vez de botão circular único |
| Remover texto em todas as larguras (sem breakpoint) | Simplifica o componente; usuário confirmou que ícones sozinhos já comunicam a ideia em qualquer tela | Usuários que dependiam do rótulo textual em telas largas passam a depender só do ícone — mitigado via `aria-label` para leitores de tela |
| Adicionar transição própria ao ícone (fade/rotate) além do slide existente | Reforça a troca de estado visualmente já que o texto (que também sinalizava a mudança) não existe mais | Introduz uma segunda camada de animação a manter/testar (ícone + thumb), leve aumento de complexidade no CSS/JSX do componente |

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Teste existente (`theme-toggle.test.tsx`) quebra por depender do texto "Claro"/"Escuro" | 2 | 3 | 6 🟡 | Atualizar o teste para consultar por `role`/`aria-label` em vez de texto visível, como parte da mesma task |
| Perda de affordance para usuários que não reconhecem os ícones sol/lua como tema | 2 | 1 | 2 🟢 | `aria-label` cobre leitores de tela; ícones sol/lua são convenção amplamente reconhecida na web |
| Animação de ícone não respeitar `prefers-reduced-motion` | 1 | 2 | 2 🟢 | Aplicar `motion-reduce:transition-none` (ou equivalente) na implementação |

## Testes

- Atualizar `theme-toggle.test.tsx`: trocar asserções por texto ("Claro"/"Escuro") por asserções via `role="button"` + `aria-label` (ou `name` acessível) e verificação do ícone renderizado (`Sun`/`Moon`) via `data-testid` ou atributo equivalente já usado no projeto.
- Cobrir: estado inicial (ícone correto para o tema atual), clique alterna tema e ícone, `aria-label` reflete o novo estado após o clique.
- Não é necessário teste de animação (CSS transitions não são verificadas de forma confiável em jsdom); a verificação visual da transição é feita manualmente/via preview do app.
