---
created_at: "2026-07-29T12:14:30-03:00"
updated_at: "2026-07-29T12:14:30-03:00"
---

# Mockup visual — Botão voltar na edição de academia

## Decisões visuais

- **Posicionamento:** o link de voltar fica no topo da tela, acima do título "Editar academia", alinhado à esquerda.
- **Padrão visual:** replica o link da tela de detalhes da academia (`/academias/[id]`): ícone `ArrowLeft` + texto "Voltar para a busca" em tom muted, sem estilo de botão arredondado.
- **Hierarquia:** o link é secundário; o título da página continua sendo o elemento principal.
- **Comportamento:** navegação client-side para `/academias` via `next/link`.

## Core HTML/JSX

```tsx
<Link
  href="/academias"
  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
  data-testid="gym-edit-back-link"
>
  <ArrowLeft className="h-4 w-4" />
  Voltar para a busca
</Link>
```

## Design tokens aplicados

- **Cores:** `text-muted-foreground` (#57574f) no estado padrão, `hover:text-foreground` (#111110) no hover.
- **Tipografia:** tamanho `text-sm` (14px), fonte Inter.
- **Ícone:** `ArrowLeft` do lucide-react, tamanho 16px.
- **Layout:** `inline-flex items-center gap-2`.

## Fonte de design original

Nenhuma ferramenta externa. Layout definido via mockup do Visual Companion, replicando o padrão já existente na tela de detalhes de academia.

## Fidelidade

Este mockup é um *norte*. A fidelidade final é construída na implementação, usando os componentes e tokens reais do projeto.
