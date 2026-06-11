# Task 1: Corrigir tokens de texto nos banners de demo

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/ux-contrast-fixes-design.md`

## Visão Geral

Substituir `text-foreground` → `text-accent-foreground` e `text-muted-foreground` → `text-accent-foreground/70` nos componentes `DemoBanner` e `ErrorAlert`. Corrige contraste dark mode de ~1.2:1 para ~10.7:1.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: tokens semânticos Tailwind v4 — nunca usar valores de paleta diretamente, sempre tokens semânticos
- `no-workarounds`: raiz do problema é token errado, não falta de override em dark:

## Passos

- [ ] **Step 1: Localizar DemoBanner no arquivo**

Abrir `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`.

Encontrar o componente `DemoBanner` (linha ~25). O container possui:

```tsx
className={cn(
  "flex items-start gap-3 rounded-[12px] border border-primary bg-accent px-4 py-3 text-sm text-foreground",
  className,
)}
```

- [ ] **Step 2: Corrigir token de texto do container DemoBanner**

Substituir `text-foreground` por `text-accent-foreground` na className do container:

```tsx
className={cn(
  "flex items-start gap-3 rounded-[12px] border border-primary bg-accent px-4 py-3 text-sm text-accent-foreground",
  className,
)}
```

- [ ] **Step 3: Corrigir token de texto do span secundário do DemoBanner**

No mesmo componente, a `<span>` secundária (linha ~41):

```tsx
<span className="text-muted-foreground">
```

Substituir por:

```tsx
<span className="text-accent-foreground/70">
```

- [ ] **Step 4: Corrigir token de texto do ErrorAlert**

Encontrar o componente `ErrorAlert` (linha ~197). O container possui:

```tsx
className="rounded-[12px] border border-border bg-accent px-4 py-3 text-sm text-foreground"
```

Substituir `text-foreground` por `text-accent-foreground`:

```tsx
className="rounded-[12px] border border-border bg-accent px-4 py-3 text-sm text-accent-foreground"
```

- [ ] **Step 5: Verificar lint**

```bash
cd apps/frontend && pnpm lint:fix
```

Esperado: zero erros/warnings.

- [ ] **Step 6: Verificar tipos**

```bash
pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 7: Executar testes unitários**

```bash
pnpm test
```

Esperado: todos passam (mudanças são apenas CSS classes — nenhum teste de lógica afetado).

## Critérios de Sucesso

- `DemoBanner` container: `text-accent-foreground` (não `text-foreground`)
- `DemoBanner` span: `text-accent-foreground/70` (não `text-muted-foreground`)
- `ErrorAlert` container: `text-accent-foreground` (não `text-foreground`)
- `pnpm lint:fix` passa com zero issues
- `pnpm tsc:check` passa com zero erros
