# Task 5: Default para CRON_TIME_TO_UPDATE_CACHE

**Status:** DONE
**PRD:** N/A
**Spec:** `../../../../apps/backend/reports/security-review-2026-05-18.md`

## Visão Geral

A variável de ambiente `CRON_TIME_TO_UPDATE_CACHE` é requerida no schema Zod sem valor padrão (`z.string()`). O arquivo `.env.test` não contém essa variável. Quando um desenvolvedor tenta iniciar a aplicação sem configurar explicitamente essa variável, recebe um erro de validação que expõe o nome da variável interna nas mensagens de erro.

A correção é adicionar `.default("0 * * * *")` (executar no início de cada hora) ao campo no schema Zod.

> **Nota:** Esta tarefa também deve ser feita após a Task 1, pois a Task 1 remove `.env.test` do git tracking e cria `.env.test.example`. O default no schema garante que mesmo sem a variável no arquivo local, a aplicação inicializa sem erro.

## Arquivos

- Modify: `apps/backend/src/shared/infra/env/index.ts`

### Conformidade com as Skills Padrão

- no-workarounds: usar o mecanismo padrão do Zod (`.default()`) em vez de checar a variável em runtime

## Passos

- [ ] **Step 1: Localizar CRON_TIME_TO_UPDATE_CACHE no schema de env**

```bash
grep -n "CRON_TIME_TO_UPDATE_CACHE" apps/backend/src/shared/infra/env/index.ts
```

Esperado:
```
27: CRON_TIME_TO_UPDATE_CACHE: z.string(),
```

- [ ] **Step 2: Adicionar o default ao campo**

Abra `apps/backend/src/shared/infra/env/index.ts`.

**Antes:**
```typescript
CRON_TIME_TO_UPDATE_CACHE: z.string(),
```

**Depois:**
```typescript
CRON_TIME_TO_UPDATE_CACHE: z.string().default("0 * * * *"),
```

O `"0 * * * *"` significa "no minuto 0 de cada hora" — execução horária. Escolha razoável para um job de cache em produção.

- [ ] **Step 3: Executar lint e type check**

```bash
pnpm --filter backend biome:fix && pnpm --filter backend tsc:check
```

Esperado: zero erros em ambos.

- [ ] **Step 4: Executar todos os testes para confirmar que não quebrou nada**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam. Em particular, nenhum erro de "Invalid environment variables" relacionado a `CRON_TIME_TO_UPDATE_CACHE`.

- [ ] **Step 5: Confirmar que o default funciona sem a variável**

```bash
node -e "
process.env.NODE_ENV = 'test'
process.env.PORT = '3333'
process.env.PRIVATE_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
// sem CRON_TIME_TO_UPDATE_CACHE propositalmente
const { z } = require('zod')
// apenas teste conceitual — o schema real está em env/index.ts
const schema = z.object({ CRON: z.string().default('0 * * * *') })
const result = schema.safeParse({})
console.log('CRON value:', result.data?.CRON)
"
```

Esperado:
```
CRON value: 0 * * * *
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/shared/infra/env/index.ts
git commit -m "fix: add default value for CRON_TIME_TO_UPDATE_CACHE env var

Prevents env validation failure when CRON_TIME_TO_UPDATE_CACHE is not
set. Default is '0 * * * * ' (run at minute 0 of every hour).

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `CRON_TIME_TO_UPDATE_CACHE: z.string().default("0 * * * *")` presente no schema
- A aplicação inicializa sem erro mesmo quando `CRON_TIME_TO_UPDATE_CACHE` está ausente do ambiente
- `pnpm --filter backend biome:fix` e `pnpm --filter backend tsc:check` sem erros
- `pnpm --filter backend test:run` passa 100%
