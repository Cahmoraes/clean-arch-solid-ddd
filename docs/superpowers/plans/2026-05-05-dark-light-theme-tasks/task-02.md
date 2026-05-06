# Task 2: Adicionar tokens CSS dark no globals.css [RF-008, RF-010]

**Status:** PENDING
**Plan:** `../2026-05-05-dark-light-theme.md`

## Visão Geral

Adiciona o bloco `.dark { }` ao `globals.css` do frontend, sobrescrevendo apenas os tokens CSS semânticos (aliases shadcn-compatíveis) com a paleta Cinza Escuro estilo macOS (#1c1c1e base).

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`

## Passos

- [ ] **Step 1: Abrir `apps/frontend/src/app/globals.css` e adicionar o bloco dark ao final do arquivo**

```css
.dark {
  --color-background: #1c1c1e;
  --color-foreground: #f5f5f7;
  --color-card: #2c2c2e;
  --color-card-foreground: #f5f5f7;
  --color-popover: #2c2c2e;
  --color-popover-foreground: #f5f5f7;
  --color-muted: #2c2c2e;
  --color-muted-foreground: #8e8e93;
  --color-border: #3a3a3c;
  --color-input: #3a3a3c;
  --color-primary: #f5f5f7;
  --color-primary-foreground: #1c1c1e;
  --color-secondary: #3a3a3c;
  --color-secondary-foreground: #ebebf5;
  --color-accent: #3a3a3c;
  --color-accent-foreground: #ebebf5;
  --color-destructive: #ebebf5;
  --color-destructive-foreground: #1c1c1e;
}
```

- [ ] **Step 2: Verificar lint e tipos**

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
```

Expected: zero issues em ambos.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/globals.css
git commit -m "feat(frontend): add dark theme CSS tokens (macOS-style gray)"
```

## Critérios de Sucesso

- Bloco `.dark { }` presente no `globals.css` com todos os 19 tokens [RF-008]
- `biome:fix` e `tsc:check` passam sem erros [RF-010]
