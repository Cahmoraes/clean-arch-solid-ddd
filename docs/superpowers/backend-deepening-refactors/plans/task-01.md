# Task 1: Remover UserRepository.delete() (interface + 4 implementações)

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** N/A

## Visão Geral

O método `UserRepository.delete()` tem **zero callers** em código de produção e testes — a deleção de usuário é soft-delete (`user.delete()` na entidade + `repository.update()`). Remover o método da interface e das 4 implementações concretas (Prisma, SQLite, InMemory, Pg) estreita a interface ao que é realmente usado.

**Nota (ADR-001):** NÃO remover `UserQuery` nem o método `get(userQuery)` — material de estudo intencional.

## Arquivos

- Modify: `apps/backend/src/user/application/persistence/repository/user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/sqlite/sqlite-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/pg/pg-user-repository.ts`

### Conformidade com as Skills Padrão

- refactoring: remoção de código morto sem mudança de comportamento observável
- no-workarounds: deleção limpa — sem comentar código, sem `@ts-ignore`
- test-antipatterns: nenhum teste novo necessário (método não tem callers); testes existentes não podem quebrar

## Passos

Todos os comandos rodam a partir da raiz do monorepo (`/home/cahmoraes/projects/estudo/clean-arch-solid-ddd`).

- **Step 1: Confirmar que o método está morto (pré-condição)**

Run: `grep -rn "Repository\.delete(\|userRepository\.delete(" apps/backend/src apps/backend/test --include="*.ts" | grep -v "user\.delete()"`
Expected: nenhuma linha de produção/teste chamando `userRepository.delete(...)` (apenas definições dentro dos próprios repositórios). Se aparecer um caller, PARE e reporte — a pré-condição da spec foi violada.

- **Step 2: Remover o método da interface**

Em `apps/backend/src/user/application/persistence/repository/user-repository.ts`, remover a linha 11:

```typescript
// ANTES
export interface UserRepository {
	get(userQuery: UserQuery): Promise<User | null>
	userOfEmail(email: string): Promise<User | null>
	userOfGoogleId(googleId: string): Promise<User | null>
	userOfId(id: string): Promise<User | null>
	save(user: User): Promise<void>
	update(user: User): Promise<void>
	delete(user: User): Promise<void>
	withTransaction<TX extends object>(object: TX): UserRepository
}

// DEPOIS
export interface UserRepository {
	get(userQuery: UserQuery): Promise<User | null>
	userOfEmail(email: string): Promise<User | null>
	userOfGoogleId(googleId: string): Promise<User | null>
	userOfId(id: string): Promise<User | null>
	save(user: User): Promise<void>
	update(user: User): Promise<void>
	withTransaction<TX extends object>(object: TX): UserRepository
}
```

- **Step 3: Rodar tsc para ver as implementações órfãs**

Run: `pnpm --filter backend tsc:check`
Expected: PASS (TypeScript não reclama de métodos extras em implementações — este passo confirma que nada além das implementações referencia o método).

- **Step 4: Remover o método das 4 implementações**

Em `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts` (linhas ~138-144), remover:

```typescript
	public async delete(user: User): Promise<void> {
		await this.prisma.user.delete({
			where: {
				id: user.id,
			},
		})
	}
```

Em `apps/backend/src/shared/infra/database/repository/sqlite/sqlite-user-repository.ts` (linhas ~183-192), remover:

```typescript
	public async delete(user: User): Promise<void> {
		this.sqliteConnection
			.query(/*SQL*/ `
      DELETE FROM 
        "users"
      WHERE
        id = ?  
    `)
			.run(user.id)
	}
```

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts` (linhas ~64-66), remover:

```typescript
	public async delete(user: User): Promise<void> {
		this.users.delete(user)
	}
```

Em `apps/backend/src/shared/infra/database/repository/pg/pg-user-repository.ts` (linhas ~20-22), remover:

```typescript
	public async delete(): Promise<void> {
		throw new Error("Method not implemented.")
	}
```

- **Step 5: Rodar a validação completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: biome zero issues, tsc zero erros, todos os testes unitários PASS.

Run: `pnpm --filter backend test:business-flow && pnpm --filter backend build`
Expected: todos os business-flow tests PASS, build com sucesso.

- **Step 6: Commit**

```bash
git add apps/backend/src/user/application/persistence/repository/user-repository.ts apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts apps/backend/src/shared/infra/database/repository/sqlite/sqlite-user-repository.ts apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts apps/backend/src/shared/infra/database/repository/pg/pg-user-repository.ts
git commit -m "refactor(user): remove dead UserRepository.delete() from interface and implementations"
```

## Critérios de Sucesso

- `UserRepository` tem 7 métodos (sem `delete`)
- Nenhuma das 4 implementações declara `delete()`
- `pnpm --filter backend biome:fix`, `tsc:check`, `test:run`, `test:business-flow` e `build` passam 100%
- `UserQuery` e `get()` permanecem intocados (ADR-001)
