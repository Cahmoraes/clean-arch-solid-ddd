# Task 4: Regenerar tipos compartilhados (`@repo/api-types`)

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** task-03

## Visão Geral

Regenerar os tipos compartilhados em `packages/api-types` a partir do OpenAPI spec exportado do backend, agora que os endpoints `GET /gyms` e `GET /gyms/search/{name}` respondem com o novo envelope `{ gyms, pagination: { total, page, limit } }` (produzido na task-03). Esta task não edita nenhum arquivo manualmente — apenas roda o script de geração já existente e confirma, via diff, que o novo shape foi capturado corretamente. É esperado (e aceitável) que `pnpm --filter frontend tsc:check` passe a falhar após esta task, porque os hooks do frontend ainda não foram atualizados para o novo shape — essa falha é resolvida na task-05.

## Arquivos

- Nenhum arquivo editado manualmente. Arquivos gerados/afetados (não editar à mão): `packages/api-types/src/**` (ou path equivalente do output do gerador), conforme o script `pnpm generate:types` já produz hoje.

### Conformidade com as Skills Padrão

- `typescript-advanced`: validar que os tipos gerados (union/interfaces do client OpenAPI) refletem corretamente o novo shape aninhado `{ gyms: GymSummary[]; pagination: { total: number; page: number; limit: number } }`, sem perda de precisão de tipos (ex.: `total`/`page`/`limit` não devem virar `any` ou `unknown` por falha na geração).

## Passos

- **Step 1: Confirmar que o backend está com a spec atualizada**

Antes de gerar os tipos, garanta que as tasks 01–03 estão aplicadas (o schema Zod de resposta dos controllers de gym já reflete `{ gyms, pagination }`). Não é necessário rodar testes do backend novamente nesta task — apenas prosseguir com a geração.

- **Step 2: Rodar a geração de tipos**

Run: `pnpm generate:types`
Expected: o comando finaliza com sucesso (exit code 0), exportando o OpenAPI spec do backend e regenerando os tipos do client em `packages/api-types`.

- **Step 3: Verificar o diff dos tipos gerados**

Run: `git diff --stat`
Expected: arquivos dentro de `packages/api-types` (e possivelmente um arquivo de spec OpenAPI exportado, ex. `openapi.json`/`openapi.yaml` no backend) aparecem como modificados. Inspecione o diff completo dos arquivos de tipos relacionados a `/gyms` e `/gyms/search/{name}`:

Run: `git diff -- packages/api-types | grep -A 20 "gyms"`
Expected: o diff mostra a mudança do shape de resposta de um array (`GymSummary[]`) para um objeto contendo `gyms: GymSummary[]` e `pagination: { total: number; page: number; limit: number }` para ambos os endpoints. Não deve ser necessário editar manualmente nenhum arquivo gerado — se o diff não refletir a mudança esperada, isso indica que a task-03 não foi aplicada corretamente ao spec fonte (volte à task-03 antes de prosseguir).

- **Step 4: Rodar tsc:check do frontend e confirmar a falha esperada (documentada, não corrigida aqui)**

Run: `pnpm --filter frontend tsc:check`
Expected: FALHA esperada — erros de tipo em `apps/frontend/src/features/gyms/api/index.ts`, pois o hook ainda acessa a resposta como se fosse um array bruto (`GymSummary[]`) em vez do novo objeto `{ gyms, pagination }`. Esta falha é aceitável e esperada nesta task; ela é resolvida exclusivamente na task-05, que atualiza `apps/frontend/src/features/gyms/api/index.ts` e `extended-paths.ts` para o novo shape. Não edite `index.ts` nesta task.

- **Step 5: Commit do diff gerado**

```bash
git add packages/api-types
git commit -m "chore: regenerate api types after gyms pagination contract change"
```

## Critérios de Sucesso

- `pnpm generate:types` executa com sucesso (exit code 0).
- `git diff --stat` confirma alterações em `packages/api-types` refletindo o novo shape `{ gyms, pagination: { total, page, limit } }` para `/gyms` e `/gyms/search/{name}`.
- Nenhum arquivo gerado foi editado manualmente.
- `pnpm --filter frontend tsc:check` apresenta erros esperados e documentados em `apps/frontend/src/features/gyms/api/index.ts` — isso NÃO bloqueia a conclusão desta task; é resolvido na task-05.
- O diff gerado foi commitado com uma mensagem clara referenciando a mudança de contrato de paginação.
