# Task 12: Validation gate — biome:fix + tsc:check + test:run + build [todos os RFs]

**Status:** DONE
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Gate de validação final. Executa todos os checks obrigatórios definidos no CLAUDE.md para confirmar que a feature está 100% completa: lint sem issues, TypeScript sem erros, testes passando, build de produção funcional.

## Arquivos

Nenhum arquivo novo. Correções de issues encontrados nos arquivos modificados nas tasks anteriores.

### Conformidade com as Skills Padrão

- no-workarounds: corrigir issues reais; não suprimir warnings

## Passos

- [ ] **Step 1: Executar biome:fix (tolerância zero)**

```bash
pnpm --filter backend biome:fix
```

Esperado: zero issues. Se houver issues, corrigir antes de prosseguir. Não usar `// biome-ignore` sem justificativa técnica real.

- [ ] **Step 2: Verificar TypeScript**

```bash
pnpm --filter backend tsc:check
```

Esperado: zero erros de tipo. Corrigir qualquer erro antes de prosseguir.

- [ ] **Step 3: Rodar todos os testes unitários**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam. Zero falhas.

- [ ] **Step 4: Rodar o build de produção**

```bash
pnpm --filter backend build
```

Esperado: build concluído sem erros.

- [ ] **Step 5: Commitar eventuais correções de lint/tipo**

Se o biome:fix ou tsc:check geraram correções automáticas ou manuais:

```bash
git add -p  # adicionar apenas os arquivos com correções
git commit -m "fix(login-security-lockout): corrigir issues de lint e tipo no gate de validação"
```

- [ ] **Step 6: Commit final de conclusão**

```bash
git add docs/superpowers/login-security-lockout/plans/tasks-login-security-lockout.md
git commit -m "chore(login-security-lockout): feature completa — todos os gates de validação passaram"
```

## Critérios de Sucesso

- `pnpm --filter backend biome:fix` → zero issues
- `pnpm --filter backend tsc:check` → zero erros
- `pnpm --filter backend test:run` → todos os testes passam
- `pnpm --filter backend build` → build sem erros
- Feature 100% implementada cobrindo RF-001 a RF-020
