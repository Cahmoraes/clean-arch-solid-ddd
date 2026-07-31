---
created_at: "2026-07-31T14:08:28-03:00"
updated_at: "2026-07-31T14:08:28-03:00"
---

# Especificação Visual — Desativar/Reativar Academia

## Fonte de design original

Nenhuma; layout definido apenas via mockup do companion visual (sessão de brainstorming), aprovado pelo usuário sem alterações.

## Decisões visuais (norte, não pixel-final)

- **Posição**: o novo botão de status fica dentro do mesmo container flutuante do botão "Editar" existente (`absolute top-3 right-3 z-20`), lado a lado com `gap: 8px`, sobre a imagem de capa da academia.
- **Tamanho/forma**: mesmo tamanho do "Editar" atual — quadrado 36×36px (`h-9 w-9`), `border-radius: 8px` (token de botão do tema), sem label visível (ícone + `aria-label`).
- **Cor por estado**: quando a academia está **ativa**, o botão de status é vermelho (`--color-destructive: #ff5a4d`, texto/ícone `#ffffff`) com ícone de "desligar" (ex.: `Power`/`Ban` do lucide-react) e `aria-label="Desativar academia {title}"`. Quando **desativada**, o botão vira verde (`--color-primary: #39e58c`) com um ícone de "religar" (ex.: `RotateCcw`/`Power` invertido) e `aria-label="Reativar academia {title}"` — o ícone e a cor trocam de acordo com `gym.status`, não são dois botões fixos.
- **Modal de confirmação**: reaproveita exatamente o padrão visual do `AlertDialog`/`SuspendConfirmationDialog` já existente — `border-radius: 12px`, `padding: 24px`, título em `font-display` (Space Grotesk, 19-20px), descrição em `text-sm text-muted-foreground`, footer com botão "Cancelar" (`variant="outline"`) + botão de ação (`variant="destructive"` para desativar, ou o equivalente em tom primário para reativar) com troca de label durante o pending (`"Desativando..."`/`"Reativando..."`).
- **Badge "Desativada"** na lista de busca `/academias`: visível somente para admin, ao lado/abaixo do nome da academia na linha/card do resultado.

## Núcleo HTML/JSX representativo

Trecho do mockup aprovado (estado padrão, botões flutuantes sobre a imagem de capa):

```html
<div class="hero-actions"> <!-- absolute top-3 right-3 z-20, flex gap-2 -->
  <div class="icon-btn edit" aria-label="Editar academia">
    <!-- ícone Pencil -->
  </div>
  <div class="icon-btn deactivate" aria-label="Desativar academia">
    <!-- ícone Power/Ban, bg-destructive, text-white -->
  </div>
</div>
```

Modal de confirmação (mesma estrutura do `SuspendConfirmationDialog`):

```jsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar desativação</AlertDialogTitle>
      <AlertDialogDescription>
        Essa academia deixará de aparecer nas buscas e não será mais possível fazer
        check-in nela. Os check-ins e dados já registrados são mantidos. Você pode
        reverter essa ação depois.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
      <AlertDialogAction asChild>
        <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Desativando..." : "Confirmar desativação"}
        </Button>
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Tokens aplicados

- `--color-destructive: #ff5a4d` / foreground `#ffffff`
- `--color-primary: #39e58c` (estado reativado)
- `--color-border: #e4e4dc`, radius botão `8px`, radius card/dialog `12px`
- Fonte display: Space Grotesk (títulos), corpo: Inter

## Fidelidade

Este mockup é um *norte* de layout e interação, não a tela pixel-final — a fidelidade final é construída na task de implementação, reaproveitando os componentes reais (`Button`, `AlertDialog`) já existentes no design system do projeto.
