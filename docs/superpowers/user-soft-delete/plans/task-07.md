# Task 7: Teste de autenticação — usuário soft-deleted não autentica [RF-003]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-03

## Visão Geral

O filtro de leitura da task-03 cobre a autenticação automaticamente: `AuthenticateUseCase` busca via `userOfEmail` e o login Google via `userOfGoogleId`/`userOfEmail`. Como esses métodos passam a ignorar soft-deleted, um usuário excluído não autentica. Esta task adiciona testes explícitos de regressão garantindo esse comportamento (cobre a história US-06 do PRD), sem alterar código de produção.

## Arquivos

- Modify: `apps/backend/src/session/application/use-case/authenticate.usecase.test.ts` (adicionar caso; criar o arquivo se não existir)

### Conformidade com as Skills Padrão

- use skill `test-antipatterns`: teste o fluxo real do use case com repositório InMemory; não mocke o repositório.

## Passos

- **Step 1: Localizar o setup existente do teste de autenticação**

Run: `pnpm --filter backend test:run -- -t "AuthenticateUseCase"`
Expected: a suíte existente roda. Observe o setup (`container.snapshot()`, `setupInMemoryRepositories()`, símbolo do use case em `AUTH_TYPES.UseCases.Authenticate`). Reutilize esse padrão. Se o arquivo não existir, crie-o espelhando o setup de `suspend-user.usecase.test.ts`.

- **Step 2: Escrever o teste que falha**

Adicione ao describe de autenticação (ajuste nomes de variáveis ao setup existente do arquivo):

```typescript
import { User } from "@/user/domain/user"
import { InvalidCredentialsError } from "@/session/application/error/invalid-credentials-error"

test("Não deve autenticar um usuário soft-deleted (login por senha)", async () => {
  const user = (
    await User.create({
      id: "deleted-user",
      email: "deleted@mail.com",
      name: "Deleted User",
      password: "12345678",
    })
  ).forceSuccess().value
  user.delete()
  await userRepository.save(user)

  const result = await sut.execute({
    email: "deleted@mail.com",
    password: "12345678",
  })

  expect(result.isFailure()).toBe(true)
  expect(result.value).toBeInstanceOf(InvalidCredentialsError)
})
```

> Confirme o caminho real de `InvalidCredentialsError` antes de importar (procure por `InvalidCredentialsError` em `src/session/application/error/`). Ajuste o import conforme o arquivo real.

- **Step 3: Rodar o teste e confirmar que já passa (comprova o filtro transversal)**

Run: `pnpm --filter backend test:run -- -t "soft-deleted"`
Expected: PASS — o usuário excluído não é encontrado por `userOfEmail`, então a autenticação falha com `InvalidCredentialsError`.

> Este teste deve passar imediatamente porque o filtro foi implementado na task-03. Se falhar (usuário autenticou), é uma regressão real do filtro de leitura — não relaxe o teste; corrija o filtro.

- **Step 4: (Opcional) Caso de login Google**

Se houver um arquivo de teste para `AuthenticateWithGoogleUseCase`, adicione um caso análogo salvando um usuário com `googleId` definido, chamando `user.delete()`, e verificando que o login Google não o encontra via `userOfGoogleId`. Use o setup já existente desse teste.

- **Step 5: Validar lint, tipos e a suíte completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: zero problemas; toda a suíte de unidade passa.

- **Step 6: Commit**

```bash
git add apps/backend/src/session/application/use-case/authenticate.usecase.test.ts
git commit -m "test(backend): assert soft-deleted user cannot authenticate"
```

## Critérios de Sucesso

- Existe um teste explícito garantindo que um usuário soft-deleted não autentica por senha (RF-003 / US-06).
- O teste passa sem nenhuma alteração de código de produção (comprova o filtro transversal).
- `biome:fix`, `tsc:check` e `test:run` passam.
