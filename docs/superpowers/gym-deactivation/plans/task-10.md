# Task 10: `CheckInUseCase` — bloqueia check-in em academia desativada [FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-04

## Visão Geral

Altera `CheckInUseCase` para sempre buscar a academia com `includeInactive: false` —
diferente dos use cases de leitura de academia (Tasks 7-9), aqui não existe conceito de
"admin faz check-in": o check-in nunca deve funcionar contra uma academia desativada,
independentemente de quem faz a requisição. O erro retornado continua sendo o já existente
`GymNotFoundError`, mantendo o mesmo padrão de "não revelar diferença" já usado em FR-008
(uma academia desativada e uma academia inexistente produzem exatamente o mesmo erro para
quem tenta fazer check-in).

## Arquivos

- Modify: `apps/backend/src/check-in/application/use-case/check-in.usecase.ts`
- Test: `apps/backend/src/check-in/application/use-case/check-in.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: passagem de um segundo argumento de opções tipado
  (`{ includeInactive: boolean }`) para `gymRepository.gymOfId()`.
- `vitest`: novo caso de teste adicionado ao arquivo já existente
  `check-in.usecase.test.ts`, seguindo o padrão real de imports (`createAndSaveUser`,
  `setupInMemoryRepositories`, `GymNotFoundError`, `Gym`, `DomainEventPublisher`, `EVENTS`,
  `CHECKIN_TYPES`) já usados nele.
- `no-workarounds`: reusar o `GymNotFoundError` já existente para academia desativada — nunca
  criar uma mensagem diferenciada nem pular a checagem "por engano" quando o requisitante
  parecer ser um admin (não existe esse conceito no domínio de check-in).

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
test("check-in em uma academia previamente desativada retorna failure(GymNotFoundError)", async () => {
	const userId = "any_user_id"
	await createAndSaveUser({ userRepository, id: userId })
	const gymId = "any_gym_id"
	const gym = await createAndSaveGym({
		gymRepository,
		id: gymId,
		latitude: -27.0747279,
		longitude: -49.4889672,
	})
	gym.deactivate()
	await gymRepository.update(gym)
	const input: CheckInUseCaseInput = {
		userId,
		gymId,
		userLatitude: -27.0747279,
		userLongitude: -49.4889672,
	}

	const result = await sut.execute(input)

	expect(result.isFailure()).toBe(true)
	expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)
})
```

Adicionar este caso ao `describe("CheckInUseCase", ...)` já existente em
`apps/backend/src/check-in/application/use-case/check-in.usecase.test.ts`, dentro do mesmo
bloco `describe`, reaproveitando as variáveis `sut`/`gymRepository`/`userRepository` já
declaradas e atribuídas no `beforeEach` existente do arquivo
(`sut = container.get<CheckInUseCase>(CHECKIN_TYPES.UseCases.CheckIn)`) — não redeclarar essas
variáveis dentro do novo `test()`. Também é necessário importar `createAndSaveGym` de
`test/factory/create-and-save-gym` no topo do arquivo (o arquivo hoje usa um helper privado
`_createAndSaveGym`; o novo teste pode usar esse helper privado já existente no arquivo real
em vez de `createAndSaveGym` diretamente, desde que o helper aceite desativar a academia
retornada — inspecionar `_createAndSaveGym` no arquivo real antes de escrever o teste e usar
o que já existir, mantendo a intenção do caso de teste acima).

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "CheckInUseCase"`
Expected: FAIL — o check-in é aceito com sucesso mesmo com a academia desativada, porque
`gymRepository.gymOfId()` hoje é chamado sem `includeInactive: false`.

- **Step 3: Implementação mínima**

Trecho relevante do arquivo atual (linha ~86-87 de
`apps/backend/src/check-in/application/use-case/check-in.usecase.ts`):
```typescript
const gymFound = await this.gymRepository.gymOfId(input.gymId)
if (!gymFound) return failure(new GymNotFoundError())
```

Trecho após a mudança:
```typescript
const gymFound = await this.gymRepository.gymOfId(input.gymId, {
	includeInactive: false,
})
if (!gymFound) return failure(new GymNotFoundError())
```

Nenhuma outra mudança no arquivo é necessária — o restante do fluxo de check-in (validação
de distância, criação do check-in, publicação de evento) permanece exatamente igual.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "CheckInUseCase"`
Expected: PASS — o novo caso e todos os já existentes no arquivo passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/check-in/application/use-case/check-in.usecase.ts \
  apps/backend/src/check-in/application/use-case/check-in.usecase.test.ts
git commit -m "fix(check-in): block check-in against deactivated gym"
```

## Critérios de Sucesso

- `CheckInUseCase.execute()` contra um `gymId` de uma academia previamente desativada
  retorna `failure(GymNotFoundError)`, o mesmo erro usado para um `gymId` inexistente
  (FR-007).
- A chamada a `gymRepository.gymOfId()` dentro de `CheckInUseCase` sempre passa
  `{ includeInactive: false }`, incondicionalmente — não há branch por papel de usuário
  nesse fluxo.
- Nenhum outro comportamento do fluxo de check-in (validação de distância, criação do
  registro, evento de domínio) foi alterado.
- `pnpm --filter backend test:run -- -t "CheckInUseCase"` passa sem regressão nos casos já
  existentes no arquivo.
