# Task 1: Instalar pino e remover winston

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/winston-to-pino-migration-design.md`

## Visão Geral

Atualizar as dependências do backend: adicionar `pino` e `pino-pretty`, remover `winston`. Verificar também se algum código chama diretamente o método `publish` do `WinstonAdapter` (que não existe no `Logger` interface e não será portado).

## Arquivos

- Modify: `apps/backend/package.json`

## Passos

- [ ] **Step 1: Verificar usos diretos do método `publish` do WinstonAdapter**

Buscar se algum arquivo chama `.publish(` em uma referência tipada como `WinstonAdapter` (não como `Logger`):

```bash
cd apps/backend
grep -r "\.publish(" src/ --include="*.ts" | grep -v ".test.ts"
```

Esperado: nenhum resultado ou apenas o próprio `winston-adapter.ts`. Se houver outros arquivos usando `.publish`, anotar para tratamento manual antes de prosseguir.

- [ ] **Step 2: Instalar `pino` como dependência de produção**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
pnpm --filter backend add pino
```

Esperado: `pino` adicionado em `dependencies` no `apps/backend/package.json`.

- [ ] **Step 3: Instalar `pino-pretty` como dependência de desenvolvimento**

```bash
pnpm --filter backend add -D pino-pretty
```

Esperado: `pino-pretty` adicionado em `devDependencies` no `apps/backend/package.json`.

- [ ] **Step 4: Remover `winston`**

```bash
pnpm --filter backend remove winston
```

Esperado: `winston` removido de `dependencies`.

- [ ] **Step 5: Verificar `package.json` atualizado**

```bash
cat apps/backend/package.json | grep -E "pino|winston"
```

Esperado: linhas com `pino` e `pino-pretty` presentes; nenhuma linha com `winston`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "chore(backend): replace winston with pino dependencies"
```

## Critérios de Sucesso

- `pino` presente em `dependencies`
- `pino-pretty` presente em `devDependencies`
- `winston` ausente do `package.json`
- Nenhum uso direto de `WinstonAdapter.publish` identificado fora do próprio adapter
