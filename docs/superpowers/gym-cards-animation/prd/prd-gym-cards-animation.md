---
created_at: "2026-06-09T19:18:47-03:00"
updated_at: "2026-06-09T19:18:47-03:00"
---

# PRD: Animações nos Cards de Academia

## Visão Geral

A listagem de academias (`/academias`) exibe um grid de cards que aparecem abruptamente quando os dados chegam, sem transição. Imagens carregam de forma seca e o hover atual não transmite interatividade clara. Esta feature adiciona animações polidas à experiência de navegação: entrada escalonada dos cards, hover com identidade visual da plataforma, carregamento suave das imagens e skeleton mais fiel ao layout real.

A melhoria é inteiramente visual — não altera dados, rotas ou lógica de negócio.

## Objetivos

- Eliminar a troca abrupta de conteúdo ao carregar ou filtrar a listagem
- Reforçar a identidade visual da plataforma (cor primária `#39e58c`) no comportamento hover
- Garantir que nenhuma animação prejudique usuários com sensibilidade a movimento (`prefers-reduced-motion`)
- Consolidar o sistema de animações dos cards em uma única biblioteca, eliminando a fragmentação atual entre Tailwind hover e transições CSS manuais

**Critérios de sucesso:**
- CLS (Cumulative Layout Shift) = 0 na listagem após a feature
- Todas as animações desabilitadas quando `prefers-reduced-motion: reduce` está ativo
- Zero classes `group-hover:*` ou `hover:translate*` remanescentes em `GymCard`/`GymImage`

## Histórias de Usuário

- **US-01** — Como usuário autenticado, eu quero que os cards de academia apareçam de forma suave e escalonada quando a listagem carrega, para que a experiência não pareça uma troca abrupta de conteúdo
- **US-02** — Como usuário autenticado, eu quero receber feedback visual claro ao passar o mouse sobre um card de academia, para que eu saiba que o elemento é clicável e interativo
- **US-03** — Como usuário autenticado, eu quero que as imagens das academias apareçam gradualmente enquanto carregam, para que o layout não dê um "salto" visual quando a imagem chega
- **US-04** — Como usuário autenticado, eu quero ver um placeholder de carregamento que se pareça com o card real enquanto os dados são buscados, para que eu entenda o formato do conteúdo que está chegando
- **US-05** — Como usuário com sensibilidade a movimento, eu quero que todas as animações sejam desabilitadas quando minha preferência de sistema está configurada para reduzir movimento, para que eu não tenha desconforto ao usar a plataforma
- **US-06** — Como usuário autenticado, eu quero que a transição entre resultados de busca (nova pesquisa) seja suave, para que os cards antigos saiam e os novos entrem sem troca brusca

## Funcionalidades Principais

### F1. Entrance/Stagger na listagem

Cards surgem com animação de entrada escalonada (fade + escala elástica) quando os dados chegam do servidor.

**Por que importa:** elimina a percepção de "flash" de conteúdo e dá sensação de lista que se constrói progressivamente.

**Como funciona:** o container da lista dispara a animação dos filhos com delay escalonado de ~70ms entre cada card. Cada card entra com opacity 0→1 e scale 0.92→1 com easing elástico (spring).

**Requisitos funcionais:**
- **FR-001** — A listagem deve animar a entrada de cada card com fade + escala elástica escalonada quando os dados são carregados pela primeira vez
- **FR-002** — O delay entre cada card na entrada deve ser de aproximadamente 70ms (stagger)
- **FR-003** — A animação de entrada deve ser suprimida quando `prefers-reduced-motion: reduce` estiver ativo

### F2. Hover com glow na cor primária

Ao passar o mouse sobre um card, a borda acende na cor primária da plataforma (`#39e58c`) com um translateY sutil.

**Por que importa:** reforça que o card é clicável e cria identidade visual consistente com o design system da plataforma.

**Como funciona:** ao hover, o card recebe box-shadow com borda verde semitransparente + sombra profunda, e sobe 3px no eixo Y.

**Requisitos funcionais:**
- **FR-004** — Ao hover, o card deve exibir destaque visual com borda na cor primária (`#39e58c`) e elevação sutil (translateY)
- **FR-005** — O hover deve ser suprimido (sem movimento/glow) quando `prefers-reduced-motion: reduce` estiver ativo
- **FR-006** — O comportamento de hover da imagem (scale + brightness) deve ser controlado pelo mesmo sistema que o hover do card, sem fragmentação entre Tailwind e biblioteca de animação

### F3. Blur-up na imagem

A imagem do card começa levemente borrada e revela gradualmente enquanto carrega.

**Por que importa:** evita o "salto" visual de imagem ausente → imagem carregada de forma abrupta.

**Como funciona:** `next/image` com `placeholder="blur"` exibe um placeholder de baixa resolução durante o carregamento; a transição para a imagem real é suave via CSS opacity.

**Requisitos funcionais:**
- **FR-007** — Imagens de academia devem exibir um placeholder de baixa resolução (blur) durante o carregamento
- **FR-008** — A transição do placeholder para a imagem real deve ser suave (sem troca abrupta)
- **FR-009** — O layout não deve sofrer deslocamento (CLS = 0) durante o carregamento da imagem

### F4. Skeleton melhorado com shimmer

O placeholder de carregamento exibe um skeleton com animação de shimmer wave que espelha o layout real do card.

**Por que importa:** o skeleton atual é genérico e não comunica bem o formato do conteúdo que está chegando. Um shimmer animado indica atividade ao usuário.

**Como funciona:** componente dedicado `GymCardSkeleton` com animação CSS de shimmer wave, com as mesmas proporções do `GymCard` real.

**Requisitos funcionais:**
- **FR-010** — Durante o carregamento dos dados, deve ser exibido um skeleton de carregamento para cada card esperado (6 por padrão)
- **FR-011** — O skeleton deve ter o mesmo layout do `GymCard` real: bloco de imagem, título, meta e área de rodapé
- **FR-012** — O skeleton deve ter animação de shimmer wave indicando atividade
- **FR-013** — O skeleton não deve causar deslocamento de layout quando substituído pelo card real

### F5. Transição suave entre resultados de busca

Ao realizar uma nova busca, os cards antigos saem com fade e os novos entram com a animação de entrance.

**Por que importa:** a troca abrupta entre resultados desoriente o usuário — ele não sabe se a busca funcionou ou se o conteúdo mudou.

**Como funciona:** `AnimatePresence` detecta cards removidos do DOM e aplica animação de exit (fade out) antes de desmontá-los, seguido pela entrada escalonada dos novos resultados.

**Requisitos funcionais:**
- **FR-014** — Ao filtrar ou realizar nova busca, os cards da listagem anterior devem sair com fade-out antes dos novos entrarem
- **FR-015** — A transição entre resultados deve ser suprimida quando `prefers-reduced-motion: reduce` estiver ativo

## Experiência do Usuário

**Fluxo principal:**
1. Usuário acessa `/academias`
2. Skeleton shimmer aparece enquanto os dados carregam (FR-010, FR-011, FR-012)
3. Cards chegam e surgem escalonados com fade + spring (FR-001, FR-002)
4. Imagens revelam gradualmente do blur para o full quality (FR-007, FR-008)
5. Usuário hover sobre um card → borda verde acende + card sobe levemente (FR-004)
6. Usuário filtra/busca → cards antigos saem com fade, novos entram escalonados (FR-014)

**Acessibilidade:**
- Toda animação controlada via `prefers-reduced-motion` (FR-003, FR-005, FR-015)
- Estados de `:focus-visible` devem ser preservados nos cards após a migração para Motion
- Nenhuma animação deve bloquear interação ou alterar a ordem de foco do teclado

## Restrições Técnicas de Alto Nível

| Restrição | Critério mensurável |
|---|---|
| **Performance** — apenas propriedades compositor-only animadas | CLS = 0; ≥60fps; zero propriedades `width`/`height`/`top`/`left`/`margin` animadas |
| **Acessibilidade** — `prefers-reduced-motion` respeitado | Todas as animações desabilitadas com a media query ativa; testável via browser DevTools |
| **Manutenibilidade** — sistema de animação unificado | Zero classes `group-hover:*` ou `hover:translate*` remanescentes em `GymCard`/`GymImage` após a implementação |

## Fora de Escopo

- Animações em outros cards do projeto (StatCard, KpiCards, ProfileHeroCard, etc.)
- Páginas além de `/academias`
- Animações em modais, drawers, formulários ou navegação global
- Geração dinâmica de `blurDataURL` a partir das imagens reais de cada academia
- Animações de loading em outros estados da aplicação (login, dashboard, etc.)
- Alterações em lógica de busca, paginação ou dados
