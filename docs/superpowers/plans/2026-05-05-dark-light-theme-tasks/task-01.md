# Task 1: Instalar next-themes [RF-005, RF-006, RF-009]

**Status:** DONE
**Plan:** `../2026-05-05-dark-light-theme.md`

## Visão Geral

Instala a dependência `next-themes` no pacote frontend do monorepo. Esta lib gerencia estado de tema, persistência via `localStorage` e previne FOUC com script inline antes do primeiro render.

## Arquivos

- Modify: `apps/frontend/package.json` (automático via pnpm)
- Modify: `pnpm-lock.yaml` (automático via pnpm)

## Passos

- [ ] **Step 1: Instalar a dependência**

```bash
cd /path/to/project
pnpm --filter frontend add next-themes
```

Expected: `+ next-themes X.X.X` no output. Sem erros.

- [ ] **Step 2: Verificar tipos**

```bash
pnpm --filter frontend tsc:check
```

Expected: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/package.json pnpm-lock.yaml
git commit -m "chore(frontend): add next-themes dependency"
```

## Critérios de Sucesso

- `next-themes` aparece em `apps/frontend/package.json` como dependência
- `pnpm --filter frontend tsc:check` passa sem erros
