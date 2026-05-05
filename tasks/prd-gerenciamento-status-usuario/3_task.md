# Tarefa 3.0: Backend — SuspendUserController + Fix ActivateUserController

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar o `SuspendUserController` que expõe a rota `PATCH /users/suspend` (protegida por JWT e restrita a admins), e corrigir o `ActivateUserController` que atualmente não possui a flag `onlyAdmin: true` — uma falha de segurança. Registrar o novo controller no IoC (symbols, bindings, bootstrap) seguindo o mesmo padrão do `ActivateUserController`.

<skills>
### Conformidade com Skills Padrões

- `no-workarounds` — o fix de `onlyAdmin` no `ActivateUserController` deve ser corrigido na fonte, não contornado com middleware adicional
- `tdd` — escrever testes de integração (business-flow) antes de finalizar
</skills>

<requirements>
- `SuspendUserController` deve implementar a interface `Controller` com `@injectable()`
- Rota: `PATCH /users/suspend`, `isProtected: true`, `onlyAdmin: true`
- Body: `{ userId: string (UUID) }`
- Respostas: `200 OK` | `400 Bad Request` | `401 Unauthorized` | `403 Forbidden` | `422 Unprocessable Entity`
- Decorator `@Logger` deve ser aplicado no método `init()` (espelhar `ActivateUserController`)
- Adicionar constante `UserRoutes.SUSPEND_USER = '/users/suspend'` em `user-routes.ts`
- Adicionar símbolo `USER_TYPES.Controllers.SuspendUser` em `user-types.ts`
- Registrar binding em `userModule` (container IoC)
- Resolver `SuspendUserController` no bootstrap `setup-user-module.ts`
- Corrigir `ActivateUserController`: adicionar `onlyAdmin: true` na configuração da rota
</requirements>

## Subtarefas

- [x] 3.1 Adicionar constante `UserRoutes.SUSPEND_USER` em `user-routes.ts`
- [x] 3.2 Adicionar símbolo `USER_TYPES.Controllers.SuspendUser` em `user-types.ts`
- [x] 3.3 Criar `suspend-user.controller.ts` espelhando a estrutura de `activate-user.controller.ts`
- [x] 3.4 Registrar binding no container IoC em `user-module.ts`
- [x] 3.5 Resolver `SuspendUserController` no bootstrap `setup-user-module.ts`
- [x] 3.6 Corrigir `ActivateUserController`: adicionar `onlyAdmin: true` na rota
- [x] 3.7 Executar `pnpm --filter backend test:run` e `pnpm --filter backend test:business-flow`

## Detalhes de Implementação

Consulte `techspec.md` — seções:
- **"Visão Geral dos Componentes > Backend"** (tabela de novos/modificados)
- **"Interfaces Principais > `SuspendUserController`"**
- **"Endpoints de API"**
- **"Monitoramento e Observabilidade"** (decorator `@Logger`)

## Critérios de Sucesso

- `PATCH /users/suspend` retorna `200` ao suspender usuário existente por admin autenticado
- `PATCH /users/suspend` retorna `401` sem JWT
- `PATCH /users/suspend` retorna `403` com JWT de não-admin
- `PATCH /users/activate` retorna `403` com JWT de não-admin (cobrindo o fix de `onlyAdmin`)
- `pnpm --filter backend biome:fix` e `pnpm --filter backend tsc:check` sem erros

## Testes da Tarefa

- [x] Testes de integração: criar `suspend-user.business-flow-test.ts` com cenários:
  - `200` ao suspender usuário existente com admin autenticado
  - `401` sem JWT
  - `403` com JWT de não-admin
  - `400` com `userId` inválido (não UUID)
  - `422` com `userId` inexistente
- [x] Testes de integração: atualizar `activate-user.business-flow-test.ts` adicionando cenário `403` para não-admin

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/backend/src/user/infra/controller/activate-user.controller.ts` (referência e fix)
- `apps/backend/src/user/infra/controller/routes/user-routes.ts`
- `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- `apps/backend/src/bootstrap/setup-user-module.ts`
- `apps/backend/src/user/infra/controller/activate-user.business-flow-test.ts` (referência)
- `apps/backend/src/user/infra/controller/suspend-user.business-flow-test.ts` (novo)
