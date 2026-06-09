---
created_at: "2026-06-09T19:17:00-03:00"
updated_at: "2026-06-09T19:17:00-03:00"
---

# Design — Animações nos Cards de Academia

## Visão Geral

Adicionar animações polidas à listagem de academias (`/academias`) usando `motion/react` como única fonte de verdade para animações. A feature cobre três experiências:

1. **Entrance/stagger**: cards surgem com fade + escala elástica escalonada quando os dados chegam (em vez de aparecerem todos de uma vez)
2. **Hover com glow**: borda acende na cor primária (`#39e58c`) + translateY sutil ao passar o mouse sobre um card
3. **Blur-up na imagem**: imagem do card começa borrada e revela gradualmente enquanto carrega
4. **Skeleton melhorado**: placeholder de loading com shimmer wave em CSS espelhando o layout real do card

Esta spec **supersede** a feature `gym-image-hover-transition` — o hover da imagem passa a ser controlado por `motion/react` no lugar das classes Tailwind `group-hover:*`.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Preocupação de domínio | Critério mensurável |
|---|---|---|
| **Performance** | Página usada em loop pelo usuário — animação travada destrói a percepção | Nenhuma propriedade layout-triggering animada; CLS = 0; nenhum frame dropado (≥60fps) |
| **Acessibilidade** | Usuários com `prefers-reduced-motion` não podem ter experiência degradada | `MotionConfig reducedMotion="user"` ativo na página; todas as animações desabilitadas quando a media query está ativa |
| **Manutenibilidade** | Dois sistemas de animação fragmentados (Tailwind hover + CSS manual) já existem — não adicionar um terceiro | Após a feature: zero classes `group-hover:*` e `hover:translate*` remanescentes em `GymCard`/`GymImage`; `motion/react` é a única fonte de verdade para animações nesses componentes |

**Consideradas, não priorizadas:** bundle size (44kB gzip aceitável para Client Component isolado), escalabilidade (não afetada por animação).

## Componentes Afetados

| Arquivo | Mudança |
|---|---|
| `apps/frontend/src/features/gyms/components/gym-results.tsx` | `<ul>` → `motion.ul` com `variants` + `staggerChildren`; `<li>` → `motion.li` com variante de spring; `AnimatePresence` envolve a lista |
| `apps/frontend/src/features/gyms/components/gym-card.tsx` | Remove classes Tailwind de hover (`hover:-translate-y-0.5`, `hover:border-*`, etc.); adiciona `whileHover` com glow verde + translateY(-3px) |
| `apps/frontend/src/features/gyms/components/gym-image.tsx` | Remove `group`, `group-hover:scale-*`, `group-hover:brightness-*`; `<img>` → `motion.img` com `whileHover`; adiciona `placeholder="blur"` + `blurDataURL` no `next/image` |
| `apps/frontend/src/features/gyms/components/gym-card-skeleton.tsx` _(novo)_ | Substitui inline skeletons de `gym-results.tsx`; CSS shimmer wave via `@keyframes` espelhando o layout real do card |
| `apps/frontend/src/app/(authenticated)/academias/page.tsx` | Envolve conteúdo com `<MotionConfig reducedMotion="user">` |

## Decisões Arquiteturais

### D1. `motion/react` como única fonte de animação nos cards

- **Contexto:** O projeto usa Tailwind CSS com classes `hover:*` e `group-hover:*` para hover, e `transition-*` para suavização. Adicionar animações de entrance e stagger exigiria uma biblioteca externa de qualquer forma.
- **Decisão:** Substituir todas as classes Tailwind de hover/transição em `GymCard` e `GymImage` por `motion/react`. Usar `motion.ul`/`motion.li` para stagger e `whileHover` para hover.
- **Justificativa técnica:** API declarativa com variants, AnimatePresence nativo, `MotionConfig reducedMotion="user"` resolve acessibilidade automaticamente, React 19 compatível.
- **Justificativa de negócio:** Consolida sistemas fragmentados em um; reduz custo de manutenção futura e elimina inconsistências entre hover CSS e hover Motion.
- **Trade-offs aceitos:** +~44kB gzip no bundle do Client Component `/academias`; `GymCard` e `GymImage` precisam de refactoring para remover classes Tailwind de hover.

### D2. AnimatePresence na lista de resultados

- **Contexto:** Ao realizar uma nova busca, os cards trocam abruptamente — os resultados anteriores desaparecem e os novos aparecem ao mesmo tempo.
- **Decisão:** Envolver a `<ul>` com `AnimatePresence` e usar `key={gym.id}` estável em cada `motion.li`.
- **Justificativa técnica:** `AnimatePresence` detecta elementos removidos do DOM e aplica a variante `exit` antes de desmontá-los, criando uma transição suave entre listas de resultados.
- **Trade-offs aceitos:** Requer que cada card tenha `key` estável — já existente via `gym.id`.

### D3. Skeleton CSS puro (sem Motion)

- **Contexto:** O skeleton é renderizado durante o fetch dos dados, antes do bundle Motion estar disponível.
- **Decisão:** O shimmer do skeleton usa `@keyframes` CSS puro, não `motion/react`.
- **Justificativa técnica:** Skeleton é carregado _antes_ do bundle do Motion. Incluir Motion no skeleton criaria dependência circular de carregamento e aumentaria o JS inicial da página.
- **Trade-offs aceitos:** Dois mecanismos de animação coexistem, mas em camadas distintas e sem sobreposição (estado de loading vs. conteúdo carregado).

### D4. Blur-up via `next/image` placeholder

- **Contexto:** Imagens de academias carregam de forma abrupta — passam de ausente para visível sem transição.
- **Decisão:** Usar `next/image` com `placeholder="blur"` + `blurDataURL` gerado como base64 estático (SVG de 1px) como fallback genérico.
- **Justificativa técnica:** `next/image` suporta blur-up nativamente. Para imagens remotas sem geração server-side de placeholder, um `blurDataURL` base64 estático pequeno é suficiente para o efeito visual.
- **Trade-offs aceitos:** O blur placeholder é genérico (não é uma miniatura real da imagem), mas o efeito de transição opacity é preservado.

## Variants (contratos de animação)

```ts
// Container (motion.ul em gym-results)
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } }
}

// Cada card (motion.li)
const cardVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 280, damping: 22 }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
}

// Hover no card (GymCard)
const cardHover = {
  y: -3,
  scale: 1.01,
  boxShadow: "0 0 0 1px rgba(57,229,140,0.45), 0 10px 30px -12px rgba(0,0,0,0.5)"
}

// Hover na imagem (GymImage)
const imageHover = { scale: 1.05, filter: "brightness(1.08)" }
```

## Skeleton Shimmer

Novo componente `GymCardSkeleton` com CSS shimmer wave:

```css
@keyframes shimmer {
  0%   { background-position: -400px 0 }
  100% { background-position: 400px 0 }
}

.shimmer {
  background: linear-gradient(90deg, #1d1d1d 25%, #2a2a2a 50%, #1d1d1d 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
```

O componente espelha o layout do `GymCard` real: bloco de imagem (130px) + título + meta, com as mesmas dimensões e border-radius.

## Escopo

### In-scope
- `gym-results.tsx` — stagger entrance + AnimatePresence
- `gym-card.tsx` — hover com glow (remove Tailwind hover)
- `gym-image.tsx` — hover scale/brightness via Motion + blur-up (remove `group`/`group-hover:*`)
- `gym-card-skeleton.tsx` — componente novo com shimmer CSS
- `academias/page.tsx` — `MotionConfig`

### Out-of-scope
- Outros cards do projeto (StatCard, KpiCards, ProfileHeroCard, etc.)
- Páginas fora de `/academias`
- Animações em modais, drawers ou formulários
- Geração de blurDataURL dinâmica a partir das imagens reais

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Layout shift na imagem sem dimensões explícitas | 3 | 2 | 6 🔴 | `next/image` com wrapper de proporção fixa (já existe em `GymImage`) + verificar que `width/height` ou `fill` está presente |
| `AnimatePresence` com key instável → re-monta todos os cards a cada render | 2 | 2 | 4 🟡 | Verificar que `key={gym.id}` está presente em todos os `motion.li`; adicionar se ausente |
| Classes `group-hover:*` residuais em `GymImage` após migração | 2 | 2 | 4 🟡 | Checklist de remoção de classes + `grep group-hover` pós-implementação |
| `motion/react` v12 conflito com React 19 | 2 | 1 | 2 🟢 | Compatibilidade confirmada na pesquisa; fixar versão mínima no `package.json` |

## Testes

- `motion.li` com variantes `hidden`/`show` presentes no DOM renderizado (RTL + mock de `motion/react`)
- `whileHover` variants aplicados corretamente no `GymCard` e `GymImage` (mock de Motion)
- `GymCardSkeleton` renderiza 6 placeholders quando `isLoading = true`
- `GymImage` renderiza `<img>` com atributo `placeholder="blur"` quando `imageKey` está presente
- Smoke: página `/academias` renderiza sem erro com `MotionConfig reducedMotion="user"` ativo
- Snapshot: `GymCard` sem classes `group-hover:*` ou `hover:translate*` residuais
