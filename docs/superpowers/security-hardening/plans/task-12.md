# Task 12: Mover @faker-js/faker para devDependencies

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → INFO-1

## Visão Geral

`@faker-js/faker` está listado em `dependencies` de produção no `apps/backend/package.json`. Esta biblioteca é usada exclusivamente em testes e factories de teste — nunca em código de produção. Movê-la para `devDependencies` reduz o bundle de produção e deixa as intenções claras.

## Arquivos

- Modify: `apps/backend/package.json`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: mover para `devDependencies`, não apenas adicionar comentário.
</skills>

## Passos

- [ ] **Step 1: Confirmar que @faker-js/faker não é usado em código de produção**

Run:
```bash
grep -r "@faker-js/faker" apps/backend/src --include="*.ts" | grep -v "test\|spec\|factory\|\.test\." | head -10
```
Expected: sem output. Se houver imports em arquivos de produção (não test/factory), NÃO prosseguir — reportar ao time.

- [ ] **Step 2: Confirmar a versão atual**

Run:
```bash
grep "faker" apps/backend/package.json
```
Expected:
```
"@faker-js/faker": "10.4.0",
```
(em `dependencies`)

- [ ] **Step 3: Mover manualmente no `package.json`**

Em `apps/backend/package.json`, remover de `dependencies`:
```json
"@faker-js/faker": "10.4.0",
```

E adicionar em `devDependencies` (criar a seção se não existir):
```json
"@faker-js/faker": "10.4.0",
```

- [ ] **Step 4: Re-instalar dependências**

Run:
```bash
pnpm install
```
Expected: sem erros. O lockfile será atualizado.

- [ ] **Step 5: Executar todos os testes para confirmar que faker ainda está disponível em teste**

Run:
```bash
pnpm --filter backend test:run 2>&1 | tail -10
```
Expected: todos os testes passam. `faker` continua disponível em `devDependencies`.

- [ ] **Step 6: Verificar typecheck e build de produção**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend build 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
cd apps/backend
git add package.json pnpm-lock.yaml
git commit -m "fix(infra): move @faker-js/faker from dependencies to devDependencies

faker is only used in tests and test factories. Moving to dev
reduces the production bundle size and clarifies intent.

INFO-1 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `@faker-js/faker` em `devDependencies` no `package.json`
- `@faker-js/faker` não presente em `dependencies`
- Todos os testes passam após `pnpm install`
- `build` e `tsc:check` sem erros
