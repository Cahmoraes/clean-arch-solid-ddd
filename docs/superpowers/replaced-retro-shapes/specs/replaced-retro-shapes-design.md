# Formas e Tipografia Retrô Replaced: Design

- **Feature anterior (base):** `../../replaced-visual-redesign/specs/replaced-visual-redesign-design.md`
- **Norte visual:** `mockups/replaced-retro-shapes-visual.md`

## Visão Geral

O redesign Replaced trocou paleta e trouxe a arte em pixel, mas manteve a linguagem de forma de SaaS moderno: cantos arredondados (14px em botões e campos, 22px em cards), pills e círculos. O jogo Replaced é retro-futurista ("cassette futurism", América alternativa dos anos 80): computadores antigos, TVs de tubo, rádios, HUD de painel. Esta feature aproxima a interface dessa identidade mudando **forma, tipografia e textura**, sem tocar paleta nem layout.

**Resultado esperado:** nenhum elemento retangular arredondado; cantos chanfrados (corte diagonal) em containers e controles; fonte bitmap de terminal (VT323) em títulos, rótulos, botões e números; scanlines de CRT em superfícies de destaque no tema escuro; caret em bloco ciano nos campos.

**Quem serve:** todos os usuários do frontend (aluno, admin), nos temas escuro e claro.

**Como se observa o sucesso:** guarda automatizada sem ocorrências de `rounded-full` nem `rounded-[..]` em `apps/frontend/src`; componentes base chanfrados no Chrome/Edge e retos nos demais; testes axe (escuro e claro) e E2E verdes; `biome:fix`, `tsc:check`, `test` e `build` passando.

**Nota de entendimento corrigida:** o usuário escolheu escopo completo (forma + tipografia + textura), elementos circulares por natureza também viram quadrados, chanfrado (variante B) em todos os componentes, VT323 (variante T2), scanlines só em superfícies de destaque, tema claro sem scanlines.

## Escopo

**Dentro:**
- Tokens de raio reinterpretados como tamanho de chanfro, com `corner-shape: bevel` sob `@supports`.
- Normalização de todos os `rounded-*` avulsos de `components/`, `features/` e `app/` para os tokens; `rounded-full` e valores arbitrários `rounded-[Npx]` eliminados.
- Elementos circulares (avatar, dot de status, spinner, radio, thumb de switch, skeleton circular) passam a quadrados.
- VT323 como fonte de display: títulos h1–h3, título de card e de modal, eyebrows e rótulos de seção, botões, números de KPI, badges.
- Utilitário de scanlines aplicado só a: PixelScene, hero do dashboard, cards de KPI, sidebar. Só no tema escuro.
- Caret em bloco na cor de acento nos campos de texto.
- Atualização de `globals-tokens.test.tsx`, nova guarda de resíduo de arredondamento, atualização de `apps/frontend/AGENTS.md` (hoje descreve a paleta "Superhumon", desatualizada).

**Fora de escopo:**
- Paleta de cores: mantida (decisão da feature `replaced-visual-redesign`).
- Layout de páginas e estrutura do shell: mantidos (mesmo motivo).
- Chanfrado via `clip-path` no Firefox e no Safari: rejeitado em D1; esses navegadores mostram canto reto até implementarem `corner-shape`.
- Fonte pixel em texto corrido, campos e tabelas: a VT323 perde leitura abaixo de ~16px; Inter continua.
- Glow ou brilho de fósforo em texto: proibido pelo FR-006 da feature anterior.
- Efeitos animados de CRT (flicker, rolagem de linha, curvatura): não pedidos; exigiriam o controle de pausa e o limite de 3 intermitências/s.
- Globo WebGL do clima: fora do sistema de tokens, já é exceção nas guardas existentes.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Preocupação de domínio | Critério mensurável | Escopo |
|---|---|---|---|
| Acessibilidade | Troca de fonte e forma não pode quebrar o que a feature anterior garantiu | axe sem violações nos temas escuro e claro; anel de foco duplo visível em todo controle focável; contraste 4,5:1 medido sem scanline | todo o frontend |
| Consistência visual | Arredondamento residual quebra a identidade; hoje há ~200 usos avulsos, muitos fora dos tokens | guarda automatizada com zero `rounded-full` e zero `rounded-[` em `src/` (exceto allowlist) | todo o frontend |
| Manutenibilidade | A forma deve mudar num lugar só, como a paleta | chanfro controlado só por `--radius-*` e pelo bloco `@supports` em `globals.css`; nenhum componente declara `corner-shape` | tokens |

**Consideradas, não priorizadas:** performance de paint (scanline estática em poucas superfícies, custo baixo), compatibilidade uniforme entre navegadores (aceito o fallback reto, D1).

## Arquitetura e Fluxo

Toda a mudança é CSS dirigido por tokens em `apps/frontend/src/app/globals.css` (Tailwind v4 `@theme`) e pelo carregamento de fontes em `layout.tsx` (`next/font/google`).

1. `--radius-*` passa a significar o **tamanho do chanfro**. Fora do `@supports`, uma regra zera todos os raios, então o fallback é o canto reto.
2. Dentro de `@supports (corner-shape: bevel)`, os raios recebem os tamanhos da tabela abaixo e `corner-shape: bevel` é aplicado globalmente, então todo `rounded-*` vira chanfro. Borda, fundo, sombra e contorno seguem a forma do elemento (a validar no spike, D1).
3. As classes utilitárias dos componentes continuam `rounded-sm/md/lg/xl`; o que muda é o valor do token.
4. `--font-display` passa a apontar para VT323. Os papéis que hoje usam `font-mono` para rótulos passam a `font-display`; `--font-mono` (JetBrains Mono) fica para código e números tabulares em tabelas.

| Token | Hoje | Chanfro novo | Uso |
|---|---|---|---|
| `--radius-xs` | 6px | 2px | checkbox, badges pequenos |
| `--radius-sm` | 8px | 4px | badges, avatar sm, tabs trigger |
| `--radius-md` | 14px | 6px | botões, campos, segmented, tabs |
| `--radius-lg` | 22px | 10px | cards internos, popovers |
| `--radius-xl` | 22px | 12px | cards, dialogs, sheets |

Elementos com menos de 12px de lado (dots de status) usam `rounded-none`: um chanfro neles vira losango.

## Componentes

| Componente | Responsabilidade | Oculta | Acoplamento |
|---|---|---|---|
| Tokens de forma (`globals.css`) | Tamanho do chanfro e ativação de `corner-shape` | a detecção de suporte e o fallback reto | consumido via classes `rounded-*` |
| Tokens de tipografia (`globals.css` + `layout.tsx`) | Qual família é display, sans e mono | o carregamento e o fallback métrico do `next/font` | consumido via `font-display`, `font-sans`, `font-mono` |
| Utilitário `crt-scanlines` (`globals.css`) | Textura de linhas atrás do conteúdo, só no tema escuro | o gradiente, a opacidade e a camada (atrás do texto) | classe aplicada em 4 superfícies |
| Caret retrô (`globals.css`, base) | Caret em bloco na cor de acento | a propriedade progressiva `caret-shape` | aplicado a `input`, `textarea` |
| Componentes base (`components/ui/*`) | Usam só tokens; circulares viram quadrados | nada novo | shadcn/Radix |
| Guarda de resíduo (`src/test/rounded-residue.test.ts`) | Falha se surgir `rounded-full` ou `rounded-[` em `src/` | allowlist de exceções | roda em `test` |

## Especificação Visual

**Artefato curado:** `mockups/replaced-retro-shapes-visual.md`

**Fonte de design original:** nenhuma; decidido via mockups do companion visual (variantes de canto A/B/C e de fonte T1/T2/T3).

**Decisões visuais (norte, não pixel-final):**
- Forma: variante **B · Chanfrado**, corte diagonal nos quatro cantos via `corner-shape: bevel` (o mockup usou `clip-path` em dois cantos só para ilustrar; a implementação corta os quatro).
- Tipografia: variante **T2 · VT323** em títulos, eyebrows, rótulos, botões (maiúsculas, tracking 0,06em), KPIs e badges; Inter no corpo, campos e tabelas. VT323 tem x-height baixa: tamanhos ~1,25× os atuais (título de card 20px → 26px; botão 13px → 18px; rótulo 10px → 15px); nenhum texto em VT323 abaixo de 15px.
- Textura: scanlines `repeating-linear-gradient` (1px escuro a cada 3px, opacidade ~0,22) **atrás** do conteúdo.
- Caret: bloco ciano (`--color-accent`).

**Fidelidade:** o mockup é um norte; a fidelidade final é construída nas tasks, conferida no navegador nos dois temas.

## Fronteiras e Contratos

Nenhuma integração nova. **Significados:**
- `--radius-*` = tamanho do chanfro em px quando há suporte a `corner-shape`; 0 quando não há. Nunca significa raio de arredondamento.
- `rounded-full` = proibido em `src/` (exceto allowlist); círculo não faz parte da identidade.
- `font-display` = VT323, peso único 400; `font-bold` não se aplica a ela.
- Scanline = decoração; nunca entra no cálculo de contraste e nunca fica sobre o texto.

## Falhas e Erros

| Falha | Detecção | Comportamento | O que o usuário vê |
|---|---|---|---|
| Navegador sem `corner-shape` (Firefox, Safari) | `@supports` falso | raios zerados | cantos retos (variante A) |
| VT323 não carrega | `next/font` com `display: swap` e fallback | usa monospace do sistema | títulos em mono padrão |
| Glifo ausente na VT323 | navegador | cai para o fallback por caractere | caractere em mono padrão |
| `caret-shape` sem suporte | navegador ignora a propriedade | caret fino nativo | caret fino na cor de acento |
| Anel de foco não segue o chanfro | spike (D1) | vira 🔴 e reabre D1 antes de seguir | n/a (bloqueia o plano) |

## Decisões Arquiteturais

### D1. Vamos chanfrar os cantos com `corner-shape: bevel` sob `@supports`, com fallback reto

- **Contexto:** alternativas: `clip-path` em utilitários (rejeitada: recorta o anel de foco duplo, o glow e as sombras, exige reimplementar borda e foco em cada componente e arrisca regressão axe); híbrido `corner-shape` + `clip-path` (rejeitada: duas implementações, e o fallback herda os problemas da `clip-path`).
- **Decisão:** vamos reinterpretar `--radius-*` como tamanho de chanfro e ativar `corner-shape: bevel` só onde há suporte (Chrome/Edge 139+, dado MDN BCD); sem suporte, raio 0.
- **Justificativa:** técnica: preserva foco, glow e sombra sem tocar componentes, e atende Acessibilidade e Manutenibilidade; de negócio: identidade Replaced com o menor retrabalho.
- **Consequências:** ganha mudança concentrada em tokens; aceita que Firefox e Safari mostrem canto reto e depende de propriedade experimental.
- **Conformidade:** a guarda de resíduo impede `rounded-full`/`rounded-[`; nenhum arquivo fora de `globals.css` declara `corner-shape` (verificado pela mesma guarda); spike valida foco e borda no Chrome antes da normalização.

### D2. Vamos reverter "Raios: manter" e "Nova fonte pixel: fora de escopo" da feature anterior

- **Contexto:** `replaced-visual-redesign` manteve raios e fontes, com gatilho "feedback de que cantos comprometem a estética". O gatilho disparou: o usuário pediu traços quadrados e fonte de computador antigo.
- **Decisão:** vamos trocar forma e fonte de display; paleta, layout e regras de acessibilidade daquela feature continuam valendo.
- **Justificativa:** técnica: tokens centralizados permitem a troca; de negócio: aproxima a identidade do jogo, objetivo da feature anterior.
- **Consequências:** a spec anterior fica parcialmente superada nesses dois pontos; `apps/frontend/AGENTS.md` precisa refletir o sistema real.
- **Conformidade:** `globals-tokens.test.tsx` passa a exigir VT323 como display; guarda de resíduo.

**Decisões locais (reversíveis):**

| Decisão | Padrão escolhido | Gatilho para rever |
|---|---|---|
| Tamanhos de chanfro | 2/4/6/10/12px | chanfro imperceptível ou exagerado na conferência visual |
| Opacidade da scanline | ~0,22 | leitura prejudicada nos cards de KPI |
| Spinner | quadrado girando | parecer quebrado; trocar por blocos em sequência |
| Tamanho mínimo da VT323 | 15px | rótulo ilegível em 1366×768 |
| Caret | `caret-color` + `caret-shape: block` | propriedade removida ou bugada |

## Riscos

| Risco | Onde | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|---|
| `corner-shape` é tecnologia experimental e não validada no time; foco e borda podem não seguir o chanfro | tokens de forma | 3 | 3 | 9 🔴 | Spike como primeira task: botão, campo e card com foco duplo no Chrome; falhou → reabrir D1 |
| Normalizar ~200 usos avulsos introduz regressão visual pontual | components, features, app | 2 | 2 | 4 🟡 | Tasks por área; conferência no navegador por tela; guarda de resíduo |
| VT323 fina reduz leitura em rótulos e botões | tipografia | 2 | 2 | 4 🟡 | Escala ~1,25× e mínimo 15px; axe e conferência nos dois temas |
| Troca de família quebra teste de tokens e E2E de texto/tamanho | testes | 1 | 3 | 3 🟡 | Atualizar `globals-tokens.test.tsx` na mesma task dos tokens |

## Testes

Runner: Vitest (`pnpm --filter frontend test -- --run`) e Playwright (`pnpm --filter frontend e2e`).

- **Guarda de resíduo** (`src/test/rounded-residue.test.ts`, no molde de `legacy-green-residue.test.ts`): nenhum `rounded-full`, `rounded-[` nem `corner-shape` fora de `globals.css` em `src/`, exceto allowlist explícita.
- **Tokens** (`globals-tokens.test.tsx`): `--font-display` referencia VT323; os cinco `--radius-*` existem; o bloco `@supports (corner-shape: bevel)` existe.
- **Scanline restrita:** a classe `crt-scanlines` aparece só nas 4 superfícies permitidas (mesmo padrão da guarda da PixelScene).
- **Componentes base:** testes existentes de `components/ui` continuam verdes; avatar sem `rounded-full`.
- **E2E axe** nos temas escuro e claro sem violações novas.
- Gate final: `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run`, `pnpm build`.
