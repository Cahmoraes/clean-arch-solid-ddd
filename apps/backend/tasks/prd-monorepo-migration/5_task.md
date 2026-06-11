# Tarefa 5.0: Validar e integrar monorepo completo

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Validar que o monorepo funciona de ponta a ponta: `pnpm install` na raiz, `pnpm build`, `pnpm test`
e `pnpm lint` orquestrados pelo Turborepo passam para todos os workspaces. O fluxo completo de
regeneração de tipos (`pnpm generate:types` → `pnpm --filter frontend build`) deve funcionar sem
intervenção manual. Ao final desta tarefa, o monorepo está pronto para desenvolvimento diário.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`** — qualquer falha deve ser corrigida na causa raiz, não suprimida
- **`systematic-debugging`** — usar abordagem sistemática para diagnosticar falhas de integração
</skills>

<requirements>
- `pnpm install` na raiz instala dependências de todos os workspaces sem erros
- `pnpm build` na raiz constrói todos os workspaces na ordem correta (`api-types` → `backend` → `frontend`)
- `pnpm test` na raiz executa os testes do backend (unitários) sem erros
- `pnpm lint` na raiz executa Biome em `apps/backend/` e `apps/frontend/` sem erros
- `pnpm dev` na raiz sobe backend e frontend em paralelo (smoke test manual)
- `pnpm generate:types` seguido de `pnpm --filter frontend build` funciona sem erros
- O diretório `.turbo/` é criado na raiz indicando que o caching está funcionando
</requirements>

## Subtarefas

- [ ] 5.1 Executar `pnpm install` na raiz e verificar que todos os workspaces são linkados
- [ ] 5.2 Executar `pnpm generate:types` e confirmar `packages/api-types/index.d.ts` gerado
- [ ] 5.3 Executar `pnpm build` e verificar artifacts em `apps/backend/build/` e `apps/frontend/.next/`
- [ ] 5.4 Executar `pnpm test` e verificar que todos os testes unitários do backend passam
- [ ] 5.5 Executar `pnpm lint` e verificar que Biome passa em ambos os apps
- [ ] 5.6 Executar `pnpm build` uma segunda vez e confirmar que Turborepo usa cache (output `>>> FULL TURBO`)
- [ ] 5.7 Smoke test: executar `pnpm dev` e confirmar que backend e frontend sobem (pode encerrar após confirmação)
- [ ] 5.8 Commitar todos os arquivos da migração com mensagem convencional

## Detalhes de Implementação

Ver seção **"Sequenciamento de Desenvolvimento"** na `techspec.md`.

O cache do Turborepo funciona quando o segundo `pnpm build` exibe `>>> FULL TURBO` no output,
indicando que nenhum arquivo mudou e os artifacts foram reutilizados do cache local (`.turbo/`).

Se algum workspace falhar no `pnpm build`, verificar:
1. Se `@repo/api-types` está corretamente linkado (`pnpm ls --filter frontend`)
2. Se o `pnpm-workspace.yaml` inclui `packages/*`
3. Se o `turbo.json` tem `"^build"` no `dependsOn` do `build`

## Critérios de Sucesso

- `pnpm install` sem erros
- `pnpm build` constrói todos os workspaces sem erros
- `pnpm test` — todos os testes do backend passam
- `pnpm lint` — Biome sem erros em ambos os apps
- Segundo `pnpm build` usa cache do Turborepo
- `pnpm generate:types` gera tipos e `pnpm --filter frontend build` usa os tipos atualizados

## Testes da Tarefa

- [ ] `pnpm install` sem erros
- [ ] `pnpm build` sem erros (todos os workspaces)
- [ ] `pnpm test` — testes unitários do backend passam
- [ ] `pnpm lint` — Biome sem erros
- [ ] `pnpm build` (segunda vez) — output contém `FULL TURBO` indicando cache hit
- [ ] `pnpm generate:types` + `pnpm --filter frontend build` — sem erros de tipo

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `package.json` (raiz) — scripts finais
- `turbo.json` — pipeline final
- `pnpm-workspace.yaml` — workspaces declarados
- `apps/backend/` — workspace validado
- `apps/frontend/` — workspace validado
- `packages/api-types/` — workspace validado
