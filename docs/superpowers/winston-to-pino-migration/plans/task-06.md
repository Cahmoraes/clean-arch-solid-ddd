# Task 6: Remover WinstonAdapter e validação final

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/winston-to-pino-migration-design.md`

## Visão Geral

Deletar o arquivo `winston-adapter.ts` e o enum `LoggerLevels` (que era interno ao Winston). Verificar se `LoggerLevels` é usado em outros arquivos. Executar a bateria completa de validação: `biome:fix`, `tsc:check`, `test:run` e `build`.

## Arquivos

- Delete: `apps/backend/src/shared/infra/logger/winston-adapter.ts`

## Passos

- [ ] **Step 1: Verificar usos do `LoggerLevels` em outros arquivos**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
grep -r "LoggerLevels" apps/backend/src/ --include="*.ts" | grep -v "winston-adapter.ts"
```

- Se não houver resultados: prosseguir normalmente.
- Se houver resultados: atualizar os arquivos afetados para remover a dependência de `LoggerLevels` antes de deletar o adapter.

- [ ] **Step 2: Verificar se `WinstonAdapter` ainda é importado em algum lugar**

```bash
grep -r "WinstonAdapter\|winston-adapter" apps/backend/src/ --include="*.ts"
```

Esperado: nenhum resultado (o `infra-module.ts` já foi atualizado na Task 4).

- [ ] **Step 3: Deletar `winston-adapter.ts`**

```bash
rm apps/backend/src/shared/infra/logger/winston-adapter.ts
```

- [ ] **Step 4: Executar lint (Biome) — tolerância zero**

```bash
pnpm --filter backend biome:fix
```

Esperado: zero problemas reportados. Corrigir qualquer issue antes de prosseguir.

- [ ] **Step 5: Executar verificação de tipos**

```bash
pnpm --filter backend tsc:check
```

Esperado: nenhum erro de TypeScript. Corrigir qualquer erro antes de prosseguir.

- [ ] **Step 6: Executar todos os testes unitários**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passando. Corrigir falhas antes de prosseguir.

- [ ] **Step 7: Executar build de produção**

```bash
pnpm --filter backend build
```

Esperado: build concluído sem erros.

- [ ] **Step 8: Commit final**

```bash
git add -A
git commit -m "feat(backend): migrate logger from winston to pino

- Remove WinstonAdapter and winston dependency
- Add PinoAdapter implementing Logger interface
- Add PinoLoggerFactory with pino-pretty in dev, JSON in production
- Share single pino instance between PinoAdapter and FastifyAdapter
- Enable native Fastify request logging via pino"
```

## Critérios de Sucesso

- `winston-adapter.ts` deletado
- Nenhuma referência a `winston` ou `WinstonAdapter` no código-fonte
- `biome:fix` com zero problemas
- `tsc:check` sem erros
- `test:run` 100% passando
- `build` concluído com sucesso
