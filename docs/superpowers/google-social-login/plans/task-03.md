# Task 3: Entidade User — suporte a googleId e password opcional [RF-007, RF-008, RF-009, RF-012, RF-013, RF-014]

**Status:** PENDING
**PRD:** `../prd/prd-google-social-login.md`
**Spec:** `../specs/google-social-login-design.md`

## Visão Geral

Modificar a entidade `User` para suportar `googleId` opcional e `password` opcional, mantendo a invariante de que pelo menos um método de autenticação deve existir. Adicionar método `linkGoogleAccount()`.

## Arquivos

- Modify: `apps/backend/src/user/domain/user.ts`
- Modify: `apps/backend/src/user/domain/user.test.ts`

## Passos

- [ ] **Step 1: Escrever testes para os novos cenários**

Adicionar os seguintes testes ao final de `apps/backend/src/user/domain/user.test.ts`:

```typescript
import { GoogleId } from "./value-object/google-id.js"

// ... testes existentes ...

test("Deve criar um usuário com googleId e sem senha", async () => {
	const result = await User.create({
		name: "Google User",
		email: "google@example.com",
		googleId: "google-sub-123",
	})
	expect(result.isSuccess()).toBe(true)
	const user = result.force.success().value
	expect(user.googleId).toBe("google-sub-123")
	expect(user.password).toBeUndefined()
})

test("Não deve criar um usuário sem senha e sem googleId", async () => {
	const result = await User.create({
		name: "No Auth User",
		email: "noauth@example.com",
	})
	expect(result.isFailure()).toBe(true)
})

test("Deve criar um usuário com senha e googleId", async () => {
	const result = await User.create({
		name: "Both Auth User",
		email: "both@example.com",
		password: "any_password",
		googleId: "google-sub-456",
	})
	expect(result.isSuccess()).toBe(true)
	const user = result.force.success().value
	expect(user.googleId).toBe("google-sub-456")
	expect(user.password).toBeDefined()
})

test("Deve restaurar um usuário com googleId", () => {
	const user = User.restore({
		id: "any-id",
		name: "Restored User",
		email: "restored@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: new Date(),
		googleId: "google-sub-789",
	})
	expect(user.googleId).toBe("google-sub-789")
	expect(user.password).toBeUndefined()
})

test("Deve vincular conta Google a um usuário existente", async () => {
	const result = await User.create({
		name: "Existing User",
		email: "existing@example.com",
		password: "any_password",
	})
	const user = result.force.success().value
	expect(user.googleId).toBeUndefined()
	user.linkGoogleAccount(GoogleId.restore("google-sub-999"))
	expect(user.googleId).toBe("google-sub-999")
})
```

- [ ] **Step 2: Rodar testes para verificar que falham**

```bash
pnpm --filter backend test:run -- -t "User"
```

Esperado: FAIL — `googleId` não existe na interface `CreateUserDto`.

- [ ] **Step 3: Modificar tipos da entidade User**

Em `apps/backend/src/user/domain/user.ts`, atualizar as interfaces:

```typescript
import { GoogleId } from "./value-object/google-id.js"
import { GoogleAccountLinkedEvent } from "./event/google-account-linked-event.js"
```

Atualizar `UserConstructor`:

```typescript
export interface UserConstructor {
	id: Id
	name: Name
	email: Email
	password?: Password
	googleId?: GoogleId
	role: Role
	createdAt: Date
	updatedAt?: Date
	status: StatusTypes
	billingCustomerId?: string
}
```

Atualizar `CreateUserDto`:

```typescript
export interface CreateUserDto {
	id?: string | null
	name: string
	email: string
	password?: string
	googleId?: string
	role?: RoleTypes
	createdAt?: Date
	updatedAt?: Date
	status?: StatusTypes
	billingCustomerId?: string
}
```

Atualizar `UserRestore`:

```typescript
export interface UserRestore {
	id: string
	name: string
	email: string
	password?: string
	googleId?: string
	role: RoleTypes
	status: StatusTypes
	createdAt: Date
	updatedAt?: Date
	billingCustomerId?: string
}
```

Atualizar `ValidatedUserProps`:

```typescript
export type ValidatedUserProps = {
	name: Name
	email: Email
	password?: Password
	googleId?: GoogleId
}
```

- [ ] **Step 4: Atualizar campos privados e constructor**

Na classe `User`:

```typescript
private _password?: Password
private _googleId?: GoogleId

private constructor(props: UserConstructor) {
	super()
	this._id = props.id
	this._name = props.name
	this._email = props.email
	this._password = props.password
	this._googleId = props.googleId
	this._role = props.role
	this._createdAt = props.createdAt
	this._updatedAt = props.updatedAt
	this._status = UserStatusFactory.create(this, props.status)
	this._billingCustomerId = props.billingCustomerId
}
```

- [ ] **Step 5: Atualizar método `create()`**

```typescript
public static async create(
	createUserDto: CreateUserDto,
): Promise<Either<UserValidationErrors[], User>> {
	const hasPassword = !!createUserDto.password
	const hasGoogleId = !!createUserDto.googleId

	if (!hasPassword && !hasGoogleId) {
		return failure([new Error("User must have at least one authentication method: password or googleId")])
	}

	const userValidationOutcome = await User.validate(createUserDto)
	if (userValidationOutcome.isFailure()) {
		return failure(userValidationOutcome.value)
	}
	const id = Id.create(createUserDto.id)
	const createdAt = createUserDto.createdAt ?? new Date()
	const role = Role.create(createUserDto.role)
	return success(
		new User({
			id,
			createdAt,
			role,
			name: userValidationOutcome.value.name,
			email: userValidationOutcome.value.email,
			password: userValidationOutcome.value.password,
			googleId: userValidationOutcome.value.googleId,
			status: createUserDto.status ?? StatusTypes.ACTIVATED,
			billingCustomerId: createUserDto.billingCustomerId,
		}),
	)
}
```

- [ ] **Step 6: Atualizar método `validate()`**

```typescript
private static async validate(
	userCreateProps: CreateUserDto,
): Promise<Either<UserValidationErrors[], ValidatedUserProps>> {
	const nameResult = Name.create(userCreateProps.name)
	const emailResult = Email.create(userCreateProps.email)

	const results: Either<any, any>[] = [nameResult, emailResult]
	let passwordValue: Password | undefined
	let googleIdValue: GoogleId | undefined

	if (userCreateProps.password) {
		const passwordResult = await Password.create(userCreateProps.password)
		results.push(passwordResult)
		if (passwordResult.isSuccess()) {
			passwordValue = passwordResult.value
		}
	}

	if (userCreateProps.googleId) {
		const googleIdResult = GoogleId.create(userCreateProps.googleId)
		results.push(googleIdResult)
		if (googleIdResult.isSuccess()) {
			googleIdValue = googleIdResult.value
		}
	}

	const result = Result.combine(results)
	if (result.not.valid) return failure(result.errors)
	return success({
		email: emailResult.forceSuccess().value,
		name: nameResult.forceSuccess().value,
		password: passwordValue,
		googleId: googleIdValue,
	})
}
```

- [ ] **Step 7: Atualizar método `restore()`**

```typescript
public static restore(userRestoreProps: UserRestore): User {
	return new User({
		id: Id.restore(userRestoreProps.id),
		email: Email.restore(userRestoreProps.email),
		name: Name.restore(userRestoreProps.name),
		password: userRestoreProps.password
			? Password.restore(userRestoreProps.password)
			: undefined,
		googleId: userRestoreProps.googleId
			? GoogleId.restore(userRestoreProps.googleId)
			: undefined,
		role: Role.restore(userRestoreProps.role),
		createdAt: userRestoreProps.createdAt,
		updatedAt: userRestoreProps.updatedAt,
		status: userRestoreProps.status,
		billingCustomerId: userRestoreProps.billingCustomerId,
	})
}
```

- [ ] **Step 8: Adicionar getter `googleId` e método `linkGoogleAccount()`**

```typescript
get googleId(): string | undefined {
	return this._googleId?.value
}

get password(): string | undefined {
	return this._password?.value
}

public linkGoogleAccount(googleId: GoogleId): void {
	this._googleId = googleId
	this.refreshUpdatedAt()
	const event = new GoogleAccountLinkedEvent({
		userEmail: this.email,
		googleId: googleId.value,
	})
	this.notify(event)
}
```

Nota: o getter `password` muda de `string` para `string | undefined`.

- [ ] **Step 9: Atualizar método `checkPassword()` para lidar com password nulo**

```typescript
public checkPassword(aString: string): Promise<boolean> {
	if (!this._password) return Promise.resolve(false)
	return this._password.compare(aString)
}
```

- [ ] **Step 10: Atualizar método `changePassword()` para lidar com inicialização**

O método `changePassword()` existente já funciona — ele cria um novo Password e atribui. Não precisa de mudança.

- [ ] **Step 11: Rodar testes**

```bash
pnpm --filter backend test:run -- -t "User"
```

Esperado: TODOS os testes passam (existentes + novos).

- [ ] **Step 12: Verificar compilação**

```bash
pnpm --filter backend tsc:check
```

Esperado: podem haver erros em outros arquivos que usam `user.password` assumindo `string`. Esses serão tratados na Task 4 (repositórios).

- [ ] **Step 13: Commit**

```bash
git add apps/backend/src/user/domain/
git commit -m "feat(backend): add googleId support and optional password to User entity"
```

## Critérios de Sucesso

- User.create() com googleId e sem password → sucesso (RF-012)
- User.create() com password e sem googleId → sucesso (RF-013)
- User.create() sem password E sem googleId → falha (RF-014)
- User.restore() reconstrói googleId quando presente
- linkGoogleAccount() atribui googleId e emite evento (RF-008)
- checkPassword() retorna false quando password é undefined
- Testes existentes continuam passando
