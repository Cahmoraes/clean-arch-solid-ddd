# Tarefa 4.0: Regenerar api-types

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Após o backend estar completo (tarefas 1.0, 2.0 e 3.0), executar a regeneração do pacote `api-types` para que o frontend passe a contar com a tipagem atualizada — incluindo o campo `status: "activated" | "suspended"` em `AdminUser` e o novo endpoint `PATCH /users/suspend`. Esta tarefa é o ponto de desacoplamento entre backend e frontend.

<skills>
### Conformidade com Skills Padrões

- `no-workarounds` — não criar tipos manualmente no frontend; usar exclusivamente os tipos gerados do backend
</skills>

<requirements>
- As tarefas 1.0, 2.0 e 3.0 devem estar concluídas antes desta tarefa
- Executar `pnpm generate:types` na raiz do monorepo
- Verificar que `packages/api-types/index.d.ts` passou a incluir o campo `status` na resposta de `GET /users`
- Verificar que o novo endpoint `PATCH /users/suspend` está presente nos tipos gerados
- O pacote `@repo/api-types` deve compilar sem erros após a regeneração
</requirements>

## Subtarefas

- [x] 4.1 Confirmar que as tarefas 1.0, 2.0 e 3.0 estão completas e o backend está buildando corretamente
- [x] 4.2 Executar `pnpm generate:types` na raiz do monorepo
- [x] 4.3 Verificar no `packages/api-types/index.d.ts` a presença do campo `status` e do endpoint `/users/suspend`
- [x] 4.4 Executar `pnpm --filter frontend tsc:check` para confirmar que os novos tipos são consumidos sem erros

## Detalhes de Implementação

Consulte `techspec.md` — seção:
- **"Pontos de Integração > `api-types`"**
- **"Modelos de Dados > `AdminUser` (frontend)"**

## Critérios de Sucesso

- `packages/api-types/index.d.ts` contém `status: "activated" | "suspended"` no tipo de resposta de `GET /users`
- `packages/api-types/index.d.ts` contém o endpoint `PATCH /users/suspend`
- `pnpm --filter frontend tsc:check` passa sem erros de tipo relacionados a `status`

## Testes da Tarefa

- [ ] Verificação manual: inspecionar `packages/api-types/index.d.ts` para confirmar os novos campos
- [ ] Verificação automatizada: `pnpm --filter frontend tsc:check` sem erros de tipo

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `packages/api-types/index.d.ts` (gerado — não editar manualmente)
- `pnpm-workspace.yaml` (referência do workspace)
- Script de geração em `package.json` raiz: `pnpm generate:types`
