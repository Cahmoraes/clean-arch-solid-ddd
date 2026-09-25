# Linha de Academia Minimalista: Norte Visual (variante A)

Fonte: mockup da variante A no companion, sobre o screenshot da lista atual. Direção, não pixel final.

## Prosa

- Linha: imagem 44px à esquerda; coluna central com nome (fonte display 15px) precedido de ponto de status 8px, descrição e endereço (13px, `text-muted-foreground`).
- Direita: dois botões-ícone 32px, gap 8px, centralizados na vertical. Check-in com borda e ícone na cor `accent`; editar (admin) com borda `border` e ícone `foreground`, hover `accent`.
- Sem telefone, sem selo de texto no canto, sem pílula de Check-in.
- Ponto: `success` para Disponível, `destructive` para Desativada (admin). Rótulo em `aria-label`/`title`.

## Núcleo (HTML de referência)

```html
<div class="row">
  <div class="img"></div>
  <div class="main">
    <div class="title"><span class="dot"></span>O'Keefe - Kozey Gym</div>
    <div class="desc">Versatile composite strategy</div>
    <div class="addr">511 Main Apt. 505</div>
  </div>
  <div class="actions">
    <span class="ico checkin">✓</span>
    <span class="ico">✎</span>
  </div>
</div>
```

## Tokens

`bg-card`, `bg-surface-2` (hover), `text-card-foreground`, `text-muted-foreground`, `bg-success`, `bg-destructive`, `accent`, `border`, `font-display`. Ícones pixel-art de `pixel-icons.tsx` (16px dentro do botão de 32px).
