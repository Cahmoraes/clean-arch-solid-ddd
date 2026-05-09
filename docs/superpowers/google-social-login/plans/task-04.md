# Task 4: Repositórios — userOfGoogleId + password nullable [RF-007, RF-008, RF-011]

**Status:** DONE
**PRD:** `../prd/prd-google-social-login.md`
**Spec:** `../specs/google-social-login-design.md`

## Visão Geral

Adicionar método `userOfGoogleId(googleId: string)` à interface `UserRepository` e implementá-lo em `InMemoryUserRepository` e `PrismaUserRepository`. Atualizar os repositórios para lidar com `password_hash` nullable e `google_id`. Atualizar o factory `create-and-save-user` para suportar googleId.

## Arquivos

- Modify: `apps/backend/src/user/application/persistence/repository/user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts`
- Modify: `apps/backend/test/factory/create-and-save-user.ts`

## Passos

- [ ] **Step 1: Adicionar `userOfGoogleId` à interface UserRepository**

Em `apps/backend/src/user/application/persistence/repository/user-repository.ts`:

```typescript
import type { User } from "@/user/domain/user"

import type { UserQuery } from "./user-query"

export interface UserRepository {
	get(userQuery: UserQuery): Promise<User | null>
	userOfEmail(email: string): Promise<User | null>
	userOfId(id: string): Promise<User | null>
	userOfGoogleId(googleId: string): Promise<User | null>
	save(user: User): Promise<void>
	update(user: User): Promise<void>
	delete(user: User): Promise<void>
	withTransaction<TX extends object>(object: TX): UserRepository
}
```

- [ ] **Step 2: Implementar em InMemoryUserRepository**

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts`:

Adicionar o método `userOfGoogleId`:

```typescript
public async userOfGoogleId(googleId: string): Promise<User | null> {
	return this.users.find((user) => user.googleId === googleId)
}
```

Atualizar o método `save` para incluir `googleId`:

```typescript
public async save(user: User): Promise<void> {
	const userWithId = User.restore({
		id: user.id,
		email: user.email,
		name: user.name,
		password: user.password,
		googleId: user.googleId,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		role: user.role,
		status: user.status,
		billingCustomerId: user.billingCustomerId,
	})
	this.users.add(userWithId)
}
```

- [ ] **Step 3: Implementar em PrismaUserRepository**

Em `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts`:

Atualizar a interface `UserData`:

```typescript
interface UserData {
	id: string
	name: string
	email: string
	password_hash: string | null
	google_id: string | null
	created_at: Date
	updated_at: Date
	role: RoleTypes
	status: StatusTypes
	billing_customer_id?: string | null
}
```

Adicionar o método `userOfGoogleId`:

```typescript
public async userOfGoogleId(googleId: string): Promise<User | null> {
	const userDataOrNull = await this.prisma.user.findUnique({
		where: {
			google_id: googleId,
		},
	})
	if (!userDataOrNull) return null
	return this.restoreUser(userDataOrNull)
}
```

Atualizar `restoreUser` para lidar com nullable:

```typescript
private async restoreUser(userData: UserData): Promise<User> {
	return User.restore({
		id: userData.id,
		email: userData.email,
		name: userData.name,
		password: userData.password_hash ?? undefined,
		googleId: userData.google_id ?? undefined,
		createdAt: new Date(userData.created_at),
		updatedAt: new Date(userData.updated_at),
		role: userData.role,
		status: userData.status,
		billingCustomerId: userData.billing_customer_id ?? undefined,
	})
}
```

Atualizar `save` para incluir `google_id`:

```typescript
public async save(user: User): Promise<void> {
	await this.prisma.user.create({
		data: {
			email: user.email,
			name: user.name,
			password_hash: user.password ?? null,
			google_id: user.googleId ?? null,
			created_at: user.createdAt,
			role: user.role,
			status: user.status,
			billing_customer_id: user.billingCustomerId,
		},
	})
}
```

Atualizar `update` para incluir `google_id`:

```typescript
public async update(user: User): Promise<void> {
	await this.prisma.user.update({
		where: {
			id: user.id!,
		},
		data: {
			email: user.email,
			name: user.name,
			password_hash: user.password ?? null,
			google_id: user.googleId ?? null,
			created_at: user.createdAt,
			role: user.role,
			status: user.status,
			billing_customer_id: user.billingCustomerId,
			updated_at: user.updatedAt ? user.updatedAt : new Date(),
		},
	})
}
```

- [ ] **Step 4: Atualizar factory create-and-save-user**

Em `apps/backend/test/factory/create-and-save-user.ts`:

```typescript
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { User } from "@/user/domain/user"
import type { RoleTypes } from "@/user/domain/value-object/role"

export interface CreateAndSaveUserProps {
	userRepository: InMemoryUserRepository
	id?: string
	name?: string
	email?: string
	password?: string
	googleId?: string
	role?: RoleTypes
}

// eslint-disable-next-line complexity
export async function createAndSaveUser(props: CreateAndSaveUserProps) {
	const userId = props.id ?? "any_user_id"
	const name = props.name ?? "any_name"
	const email = props.email ?? "john@doe.com.br"
	const user = (
		await User.create({
			id: userId,
			name: name,
			email: email,
			password: props.password ?? "any_password",
			googleId: props.googleId,
			role: props.role ?? "MEMBER",
		})
	).force.success().value
	await props.userRepository.save(user)
	// biome-ignore lint/style/noNonNullAssertion: for testing
	return props.userRepository.users.find((user) => user.id === userId)!
}
```

- [ ] **Step 5: Verificar compilação**

```bash
pnpm --filter backend tsc:check
```

Esperado: sem erros de tipo.

- [ ] **Step 6: Rodar todos os testes unitários**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/user/application/persistence apps/backend/src/shared/infra/database/repository apps/backend/test/factory/create-and-save-user.ts
git commit -m "feat(backend): add userOfGoogleId to repositories and handle nullable password"
```

## Critérios de Sucesso

- `userOfGoogleId()` retorna o usuário correto por google_id (RF-007)
- `save()` e `update()` persistem `google_id` corretamente (RF-011)
- `restoreUser()` reconstrói `googleId` e lida com `password_hash` null (RF-012)
- Testes existentes continuam passando
