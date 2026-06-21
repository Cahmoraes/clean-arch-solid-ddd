---
created_at: "2026-06-21T00:00:00-03:00"
updated_at: "2026-06-21T00:00:00-03:00"
---

# UI Polish — Paginação e Select de Status

Dois ajustes visuais pontuais no frontend: (1) botões de paginação "Anterior"/"Próxima" ficam apertados em telas menores; (2) seta nativa do `<select>` de status/role no painel de edição admin é inconsistente entre browsers.

## Escopo

Dois arquivos afetados. Nenhuma mudança de backend, API, lógica de negócio ou testes de integração.

---

## Características Arquiteturais

| Característica | Prioridade | Justificativa |
|---|---|---|
| Consistência visual | Alta | Seguir o design system (tokens, ícones lucide-react já presentes) |
| Acessibilidade | Alta | Manter `aria-label` e compatibilidade keyboard |
| Mínima pegada de mudança | Alta | Tocar apenas os dois arquivos afetados, sem refactors adjacentes |

---

## Alteração 1 — Paginação (ícones apenas)

**Arquivo:** `apps/frontend/src/components/ui/pagination.tsx`

**Problema:** `PaginationPrevious` e `PaginationNext` usam `size="md"` (h-10, px-24) com o texto "Anterior"/"Próxima" ao lado do ícone. Em viewports estreitas ou quando há muitas páginas o componente fica apertado/cramped.

**Solução:** Remover os `<span>` de texto e mudar para `size="icon"`, alinhando visualmente os botões de navegação com os botões de número de página.

### Mudanças no código

**`PaginationPrevious`**:
```tsx
// ANTES
<PaginationLink aria-label="Go to previous page" size="md" className={cn("gap-1 pl-3", className)} {...props}>
  <ChevronLeft className="h-4 w-4" />
  <span>Anterior</span>
</PaginationLink>

// DEPOIS
<PaginationLink aria-label="Go to previous page" size="icon" className={cn("", className)} {...props}>
  <ChevronLeft className="h-4 w-4" />
</PaginationLink>
```

**`PaginationNext`**:
```tsx
// ANTES
<PaginationLink aria-label="Go to next page" size="md" className={cn("gap-1 pr-3", className)} {...props}>
  <span>Próxima</span>
  <ChevronRight className="h-4 w-4" />
</PaginationLink>

// DEPOIS
<PaginationLink aria-label="Go to next page" size="icon" className={cn("", className)} {...props}>
  <ChevronRight className="h-4 w-4" />
</PaginationLink>
```

### Acessibilidade
Os `aria-label` já existentes ("Go to previous page" / "Go to next page") preservam a semântica para screen readers. Nenhuma mudança necessária.

---

## Alteração 2 — Select de Status/Role (appearance-none + ícone custom)

**Arquivo:** `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`

**Problema:** `StatusField` e `RoleField` usam `<select>` nativo sem `appearance-none`. O browser renderiza sua própria seta dropdown com posição e visual inconsistentes entre OSes (Windows, macOS, Linux). O `px-4` simétrico não reserva espaço suficiente para o ícone nativo no lado direito.

**Solução:** Aplicar `appearance-none` para remover a seta nativa, aumentar o padding direito para `pr-10` e sobrepor um `ChevronDown` do lucide-react absolutamente posicionado com `pointer-events-none`.

### Mudanças no código

**`StatusField`**:
```tsx
// ANTES
<select
  id="edit-status"
  className="h-10 rounded-md border border-input bg-background px-4 text-sm text-foreground"
  ...
>

// DEPOIS
<div className="relative">
  <select
    id="edit-status"
    className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-4 pr-10 text-sm text-foreground"
    ...
  >
    ...
  </select>
  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
</div>
```

**`RoleField`**: mesma estrutura (consistência).

### Import necessário
Adicionar `ChevronDown` ao import do lucide-react no topo do arquivo.

---

## Decisões Arquiteturais

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| `size="icon"` sem texto na paginação | Responsivo (`hidden sm:inline`) | O projeto não tem breakpoint de mobile crítico na tela admin; ícones puros são o padrão shadcn/ui default | 
| `appearance-none` + ícone custom (Opção A) | shadcn/ui `<Select>` (Radix) | Menor pegada de mudança, mantém `<select>` nativo (acessível), sem adicionar dependência nova de componente; suficiente para o caso de uso |
| Mesma solução para `StatusField` e `RoleField` | Tratar só `StatusField` | Consistência visual — ambos sofrem do mesmo problema |

---

## Riscos

| Risco | Mitigação |
|---|---|
| 🟡 `size="icon"` pode ter dimensão diferente dos botões de página | Verificar visualmente no browser após a mudança; ajustar `className` se necessário |
| 🟢 `appearance-none` + `ChevronDown` quebrar acessibilidade | `<select>` nativo preserva foco/keyboard; ícone tem `pointer-events-none` |

---

## Arquivos Afetados

| Arquivo | Tipo de mudança |
|---|---|
| `apps/frontend/src/components/ui/pagination.tsx` | Remover texto + mudar size variant |
| `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx` | Wrap em `<div relative>` + `appearance-none` + `ChevronDown` |
