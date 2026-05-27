# Task 2: Corrigir hover do botão Entrar

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/ux-contrast-fixes-design.md`

## Visão Geral

Adicionar `hover:text-accent-foreground` ao link "Entrar" na landing page. O hover atual aplica `hover:bg-accent` sem override de cor de texto, resultando em texto claro (`#f5f3f0`) sobre fundo lilás (`#c9b4fa`) em dark mode — contraste ~1.2:1. Com o fix, contraste passa para ~10.7:1.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/page.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: tokens semânticos Tailwind v4 — sempre parear `bg-accent` com `text-accent-foreground`

## Passos

- [ ] **Step 1: Localizar o link "Entrar" no arquivo**

Abrir `apps/frontend/src/app/(public)/page.tsx`.

Encontrar o link "Entrar" (linha ~38). Possui:

```tsx
<Link
  href="/login"
  data-testid="cta-login"
  className="inline-flex items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-base font-medium text-card-foreground hover:bg-accent"
>
  Entrar
</Link>
```

- [ ] **Step 2: Adicionar hover:text-accent-foreground**

Adicionar `hover:text-accent-foreground` após `hover:bg-accent`:

```tsx
<Link
  href="/login"
  data-testid="cta-login"
  className="inline-flex items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-base font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground"
>
  Entrar
</Link>
```

- [ ] **Step 3: Verificar lint**

```bash
cd apps/frontend && pnpm lint:fix
```

Esperado: zero erros/warnings.

- [ ] **Step 4: Verificar tipos**

```bash
pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 5: Executar testes unitários**

```bash
pnpm test
```

Esperado: todos passam.

## Critérios de Sucesso

- Link "Entrar" possui `hover:bg-accent hover:text-accent-foreground` (ambos juntos)
- `pnpm lint:fix` passa com zero issues
- `pnpm tsc:check` passa com zero erros
