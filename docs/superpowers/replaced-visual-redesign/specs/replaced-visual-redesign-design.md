# Replaced Visual Redesign: Design

Pesquisa base: `../research/research-replaced-visual-redesign.md`. Norte visual: `mockups/replaced-visual-redesign-visual.md`.

## Visão Geral

**Problema.** O visual atual (VOLT, verde neon sobre preto) será substituído por uma linguagem mais moderna e minimalista, inspirada na arte do jogo Replaced (pixel art 2D, noite retrofuturista, neon, luz volumétrica).

**Resultado.** O frontend inteiro adota a direção "Noite neon" nos temas escuro (principal) e claro ("dia de neblina"). A arte pixel aparece só em login, hero do dashboard e estados vazios. O restante permanece limpo e denso.

**Quem serve.** Membros e administradores do app (VOLT).

**Sucesso observável.** Tokens novos aplicados em todas as telas; contraste AA nos dois temas (axe sem violações novas); animações pausáveis e desligadas sob movimento reduzido; gate final verde (biome, tsc, testes, build).

**Entendimento (corrigido pelo usuário):** modernidade visual com minimalismo, arte no estilo Replaced, direção A escolhida, abordagem 1, movimento sutil aceito, demais itens pela recomendação. Suposição: o VOLT deixa de ser a base visual; ficam tokens semânticos, estrutura de shell, acessibilidade e responsivo.

## Escopo

**Dentro**
- Troca de paleta, glow e superfícies em `globals.css` (dark e light).
- `PixelScene` e controle de movimento (novo).
- `BrandMark` redesenhado em pixel (nome VOLT mantido).
- Aplicação da arte em login, hero do dashboard, estados vazios (`EmptyState`) e como fallback de capa de card de academia sem imagem (a imagem, quando existe, prevalece).
- Telas internas de Usuários, Check-ins e Academias na direção aprovada (mockups em `specs/mockups/`).
- Passada nas demais telas para consistência e contraste, admin incluído.
- Ajuste dos testes acoplados a tokens.

**Fora de escopo**
- Redesign de layout de página e mudança de estrutura do shell (as features `design-system-migration`, `volt-redesign` e `content-width-standardization` já deixaram fora; este redesign é visual, não de layout).
- Nova fonte pixel: fontes seguem Space Grotesk, Inter e JetBrains Mono.
- Backend, API e novas dependências.
- Arte raster (PNG) e pipeline de assets externos.
- Pixel art como fundo geral da interface.

## Características Arquiteturais

| Característica | Preocupação de domínio | Critério mensurável | Escopo |
|---|---|---|---|
| Acessibilidade | Neon e escuro reduzem legibilidade se mal calibrados; o app já cumpre WCAG 2.2 AA | Texto >= 4.5:1 e componentes >= 3:1 nos dois temas; axe sem violações novas; glow nunca em texto | todas as telas |
| Desempenho de renderização | Cenas animadas podem gastar GPU em mobile | Animação só com `transform` e `opacity`; trace real sem quadros de layout/paint por quadro nas cenas; animação pausada fora da tela | cenas |
| Manutenibilidade | 148 componentes e 151 testes dependem de tokens | Componentes usam só tokens semânticos; nenhuma cor literal nova em componente | tokens e componentes |

**Consideradas, não priorizadas:** escalabilidade (frontend estático, sem carga), extensibilidade de temas (só dois temas).

## Arquitetura e Fluxo

Retheme por tokens: `globals.css` define os valores semânticos dos dois temas; componentes shadcn seguem usando os tokens e herdam a nova aparência sem alteração estrutural. A identidade visual extra vem de uma camada de arte isolada (`PixelScene`), usada apenas nas três superfícies de destaque.

Fluxo de movimento: `PixelScene` recebe `animated`; o hook `useSceneMotion` combina três condições (o usuário não pausou pelo controle, `prefers-reduced-motion` não é `reduce`, a cena está visível na tela) e expõe um estado que a cena traduz em atributo `data-paused`; o CSS pausa as animações quando o atributo está presente.

Entrega por ondas: (1) tokens, shell, `BrandMark` e testes acoplados; (2) `PixelScene`, login, hero do dashboard e estados vazios; (3) demais telas, admin, contraste, Playwright e axe.

## Componentes

**Camada de tokens (`apps/frontend/src/app/globals.css`, existente)**
- **Responsabilidade:** definir a paleta semântica e os efeitos dos temas dark e light.
- **Interface:** variáveis CSS semânticas consumidas pelos componentes.
- **Oculta:** os valores de cor, a derivação do tema claro e a regra de glow.
- **Local:** existente.
- **Depende de / usado por:** `next-themes` / todos os componentes.

**`PixelScene` (`components/ui/pixel-scene.tsx`, novo)**
- **Responsabilidade:** desenhar uma cena decorativa a partir de um nome de cena.
- **Interface:** `scene: "login" | "hero" | "empty"`, `animated?: boolean`. Sem efeitos colaterais; `aria-hidden`.
- **Oculta:** geometria em `<rect>` de coordenadas inteiras, `viewBox` pequeno escalado por fator inteiro, `shape-rendering: crispEdges`, máscaras e dither em CSS, valores fixos.
- **Local:** novo, junto dos componentes `ui/`.
- **Depende de / usado por:** `useSceneMotion` / login, `ProfileHeroCard` (hero do dashboard), `EmptyState`.

**`useSceneMotion` e `MotionToggle` (novos)**
- **Responsabilidade:** decidir se a cena anima e oferecer o controle manual de pausa.
- **Interface:** hook devolve `{ paused }`; `MotionToggle` é um botão com rótulo acessível "Pausar animações".
- **Oculta:** leitura de `matchMedia`, IntersectionObserver, persistência da escolha no navegador e falha de leitura do armazenamento (cai no padrão animado).
- **Local:** `apps/frontend/src/lib` e `components/ui`.
- **Depende de / usado por:** APIs do navegador / `PixelScene` (o hook) e os dois shells, onde o `MotionToggle` fica ao lado do `ThemeToggle`. Esse é o único acréscimo ao shell; a estrutura dele não muda.

**`BrandMark` (existente)**
- **Responsabilidade:** marca VOLT. **Oculta:** o desenho pixel do raio. Interface inalterada.

## Fronteiras e Contratos

| Fronteira | O que atravessa | Distância | Volatilidade | Veredito |
|---|---|---|---|---|
| Tokens -> componentes | nomes semânticos de variáveis CSS (contrato existente) | mesmo módulo | baixa | equilibrado |
| `PixelScene` -> páginas | props `scene` e `animated` | mesmo módulo | baixa | equilibrado |
| `useSceneMotion` -> navegador | `matchMedia`, IntersectionObserver, armazenamento local | APIs do navegador | baixa | equilibrado |

**Significados:**
- Cor de texto e borda: valor semântico que passa AA sozinho; glow nunca compõe o contraste.
- `paused`: verdadeiro se o usuário pausou, ou movimento reduzido, ou cena fora da tela.
- Preferência de pausa: guardada no navegador do usuário; ausência ou falha de leitura significa "animar".

## Dados e Consistência

Único estado persistido: a preferência de pausa, no armazenamento local do navegador (por navegador, sem sincronização entre dispositivos). Nenhuma migração.

## Falhas e Erros

| Falha | Detecção | Comportamento | O que o usuário vê |
|---|---|---|---|
| Armazenamento local indisponível ou bloqueado | exceção na leitura ou escrita | usa o padrão (animar), sem persistir | cenas animam; o toggle funciona na sessão |
| IntersectionObserver ausente | checagem de existência | trata a cena como visível | cenas animam |
| Cena com erro de renderização | limite de erro do React | omite a cena, o fundo liso permanece | tela sem a arte, sem quebrar |
| Movimento reduzido ativo | `prefers-reduced-motion: reduce` | cenas estáticas, mesmo sem clique | cena parada |

## Especificação Visual

**Artefatos curados:** `mockups/replaced-visual-redesign-visual.md` (tokens, cena e dashboard), `mockups/replaced-visual-redesign-usuarios-visual.md`, `mockups/replaced-visual-redesign-checkins-visual.md` e `mockups/replaced-visual-redesign-academias-visual.md` (telas internas, aprovadas pelo usuário).

**Fonte de design original:** Nenhuma; layout definido apenas via mockup do companion.

**Decisões visuais (norte, não pixel-final):**
- Dark: fundo azul-petróleo, primary magenta com texto escuro, ciano como acento secundário, off-white frio para texto.
- Light "dia de neblina": fundo frio claro, acentos escurecidos para passar AA.
- Sidebar escura nos dois temas.
- Arte: skyline pixel em duas camadas, feixes de luz, dither, janelas acesas, com movimento sutil.
- Glow só em bordas e formas.

**Fidelidade:** o mockup é um norte; a fidelidade final é conferida no navegador real.

## Decisões Arquiteturais

### D1. Vamos redefinir a identidade por tokens e isolar a arte em um componente `PixelScene` em SVG

- **Contexto:** o app tem cerca de 148 componentes e 151 testes ligados a tokens. Alternativas: kit de UI pixel próprio (rejeitada: contradiz o minimalismo, reescreve 33 componentes e amplia risco de legibilidade e acessibilidade); arte raster com pipeline de assets (rejeitada: depende de assets externos, aumenta peso e exige variantes por tema).
- **Decisão:** vamos trocar valores de token em `globals.css` e desenhar cenas decorativas em SVG procedural.
- **Justificativa:** técnica, mantém contraste e estrutura sob controle; de negócio, entrega a identidade nova sem depender de artista nem reescrever a interface.
- **Consequências:** ganha baixo risco e sem dependências; aceita teto artístico menor que arte desenhada à mão e o ajuste dos testes acoplados a tokens.
- **Conformidade:** teste de token garante ausência de cor literal nova em componente; axe no Playwright cobre contraste; revisão bloqueia `box-shadow` em massa.

### D2. Vamos limitar o glow a bordas e formas, e manter texto em off-white sem glow

- **Contexto:** o glow não conta para contraste e causa halation. Alternativa rejeitada: glow em texto de destaque (piora legibilidade).
- **Decisão:** glow só em elementos não textuais.
- **Justificativa:** técnica, evita falha de legibilidade que o cálculo de contraste não detecta; de negócio, preserva a leitura em telas densas.
- **Consequências:** ganha legibilidade; aceita menos "brilho" nos textos.
- **Conformidade:** revisão de código e teste que proíbe `text-shadow` em tokens de texto.

**Decisões locais (reversíveis):**

| Decisão | Padrão escolhido | Gatilho para rever |
|---|---|---|
| Fontes | manter Space Grotesk, Inter, JetBrains Mono | leitura ruim do texto pixel na arte |
| Raios e larguras | manter | feedback de que cantos comprometem a estética |
| Tema claro com arte | mesma composição em tons claros | cena não passar AA ou parecer pesada |
| Escopo da arte | login, hero, estados vazios | pedido explícito de mais superfícies |

## Riscos

| Risco | Onde | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|---|
| Custo real de blur, máscara e dither em cenas animadas não medido | `PixelScene` | 2 | 3 | 6 🔴 | Critério de aceite com trace no Chrome (sem quadros de layout/paint por quadro); começar sem blur animado |
| Testes acoplados a tokens quebram em massa | onda 1 | 2 | 3 | 6 🔴 | Tratar como tarefa da onda 1: `globals-tokens`, `layout`, `motion`, `*-volt`, `stat-card`, `status-badge`, `brand-mark` |
| Neon degrada legibilidade em telas densas | admin e tabelas | 2 | 2 | 4 🟡 | Arte fora de telas densas; texto sempre passa AA sem glow |
| Cores neon puras falham AA no claro | tema claro | 2 | 3 | 6 🔴 | Acentos escurecidos e checagem por cálculo na onda 1 |
| Mismatch de hidratação por valores aleatórios | `PixelScene` | 2 | 1 | 2 🟢 | Valores fixos, sem `Math.random()` no render |

## Testes

**Runner:** Vitest com happy-dom (`pnpm --filter frontend test -- --run`) e Playwright (`pnpm --filter frontend e2e`). Framework: Next 16.

Cenários:
- `PixelScene` renderiza estrutura estável e `aria-hidden` para cada `scene`; saída determinística.
- `useSceneMotion`: movimento reduzido, toggle manual e cena fora da tela pausam; armazenamento indisponível cai em "animar"; `matchMedia` e IntersectionObserver mockados.
- Tokens: nenhuma cor literal nova em componentes; `text-shadow` ausente em tokens de texto.
- Playwright/axe: contraste AA nos dois temas nas telas da onda; trace confirmando ausência de quadros de layout/paint por quadro nas cenas.
- Gate final (AGENTS.md): `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build` sem problemas. No frontend, os testes rodam com `pnpm --filter frontend test -- --run`, pois `test:run` não existe lá.
