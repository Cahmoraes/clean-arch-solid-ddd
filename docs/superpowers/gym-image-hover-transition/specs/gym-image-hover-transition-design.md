---
created_at: "2026-06-09T16:49:09-03:00"
updated_at: "2026-06-09T16:49:09-03:00"
---

# Design — Transição de hover suave no GymCard

## Contexto

A tela `/academias` exibe um grid de `GymCard`s. Ao passar o mouse, a imagem de capa da academia sofre um efeito de scale (`scale-[1.07]`) com `ease-out` em 300ms. O efeito é percebido como "seco" — a imagem dá um salto abrupto porque `ease-out` começa na velocidade máxima.

O comportamento do card em si (elevação sutil `translateY(-0.5)` + mudança de `border-color`) está satisfatório e não será alterado.

## Objetivo

Suavizar exclusivamente a transição da imagem de capa dentro do `GymCard`, sem alterar o comportamento do card, shadow ou qualquer outro elemento.

## Características Arquiteturais

| Característica | Prioridade | Justificativa |
|---|---|---|
| Simplicidade | Alta | Mudança de 1 linha em 1 arquivo; zero risco de regressão em outros cards |
| Performance | Alta | Usar apenas `transform` e `filter` (propriedades compositor-only — sem layout reflow) |
| Acessibilidade | Média | Respeitar `prefers-reduced-motion` já garantido pelo Tailwind (já presente no componente via `transition-*`) |

## Decisão Arquitetural

**Easing `ease-in-out` no lugar de `ease-out`**

`ease-out` (`cubic-bezier(0, 0, 0.2, 1)`) inicia a animação em velocidade máxima, causando a percepção de "salto". `ease-in-out` (`cubic-bezier(0.4, 0, 0.2, 1)`) inicia devagar, acelera no meio e desacelera no fim — eliminando o impacto inicial sem sacrificar a responsividade.

*Trade-off aceito:* duração maior (500ms vs 300ms) é necessária para que o `ease-in-out` se expresse. Em 300ms, o trecho inicial lento do `ease-in-out` seria imperceptível. O scale também é reduzido de 1.07 para 1.05 — escala maior com duração maior parece lenta; menor parece mais elegante.

## Escopo

### In-scope
- Classe `ease-out` → `ease-in-out` no `<img>` dentro de `GymImage`
- Classe `duration-300` → `duration-500` no `<img>` dentro de `GymImage`
- Classe `group-hover:scale-[1.07]` → `group-hover:scale-[1.05]` no `<img>`

### Out-of-scope
- `GymCard` (`gym-card.tsx`) — sem alterações
- Shadow no card
- `brightness-105` — mantido
- Outros cards do projeto (StatCard, KpiCards, ProfileHeroCard)

## Arquivo Afetado

| Arquivo | Mudança |
|---|---|
| `apps/frontend/src/features/gyms/components/gym-image.tsx` | `ease-out duration-300 scale-[1.07]` → `ease-in-out duration-500 scale-[1.05]` no `<img>` |

## Antes / Depois

```tsx
// Antes
className="h-full w-full object-cover transition-[transform,filter] duration-300 ease-out group-hover:scale-[1.07] group-hover:brightness-105"

// Depois
className="h-full w-full object-cover transition-[transform,filter] duration-500 ease-in-out group-hover:scale-[1.05] group-hover:brightness-105"
```

## Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Sensação de lentidão em 500ms | Baixa | Validado visualmente pelo usuário na comparação interativa |
| Regressão em `GymDetailPage` (usa `GymImage`) | Baixa | `GymDetailPage` não usa `group` no wrapper — `group-hover:*` não dispara; sem efeito colateral |
