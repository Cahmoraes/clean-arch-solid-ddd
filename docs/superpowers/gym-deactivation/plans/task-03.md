# Task 3: Entidade `Gym` — campo/getter `status` + `deactivate()`/`activate()` [FR-001, FR-002, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-02

## Visão Geral

Estende a entidade `Gym` para carregar seu `GymStatus` (Task 2), seguindo exatamente o padrão
já usado por `User`/`UserStatus`: campo privado `_status: GymStatus`, getter público
`status: GymStatusTypes`, método interno `_changeStatus()` chamado pelo próprio value object,
e dois métodos públicos delegate (`deactivate()`/`activate()`) que a aplicação chamará. Uma
academia recém-criada via `Gym.create()` é sempre `"activated"` — o status nunca é um input do
chamador na criação; só `Gym.restore()` (usado ao reconstruir a partir do banco) recebe o
status persistido.

## Arquivos

- Modify: `apps/backend/src/gym/domain/gym.ts`
- Test: `apps/backend/src/gym/domain/gym.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: extensão de tipos existentes (`GymConstructor`, `GymRestoreProps`)
  com um novo campo `status: GymStatusTypes` obrigatório, mantendo `GymCreateProps` sem esse
  campo via `Omit`/composição de tipos.
- `vitest`: adição de novos casos de teste ao arquivo `gym.test.ts` já existente, seguindo o
  padrão real de `.forceSuccess().value`/`describe`/`test` já usado nesse bounded context.
- `no-workarounds`: `deactivate()`/`activate()` delegam para `this._status`, propagando o
  `Either` de erro do value object sem mascarar falha (ex.: nunca engolir o erro de conflito
  silenciosamente).

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
test("Gym.create() resulta em status 'activated'", () => {
	const gymOrError = Gym.create({
		title: "Academia Central",
		latitude: -23.55,
		longitude: -46.63,
		cnpj: "11444777000161",
		address: "Rua das Flores, 123",
	})
	const gym = gymOrError.forceSuccess().value
	expect(gym.status).toBe("activated")
})

test("gym.deactivate() muda o status para 'deactivated' e retorna sucesso", () => {
	const gymOrError = Gym.create({
		title: "Academia Central",
		latitude: -23.55,
		longitude: -46.63,
		cnpj: "11444777000161",
		address: "Rua das Flores, 123",
	})
	const gym = gymOrError.forceSuccess().value
	const result = gym.deactivate()
	expect(result.isSuccess()).toBe(true)
	expect(gym.status).toBe("deactivated")
})

test("gym.deactivate() chamado duas vezes seguidas retorna failure na segunda chamada", () => {
	const gymOrError = Gym.create({
		title: "Academia Central",
		latitude: -23.55,
		longitude: -46.63,
		cnpj: "11444777000161",
		address: "Rua das Flores, 123",
	})
	const gym = gymOrError.forceSuccess().value
	gym.deactivate()
	const secondResult = gym.deactivate()
	expect(secondResult.isFailure()).toBe(true)
	expect(secondResult.forceFailure().value).toBeInstanceOf(GymAlreadyDeactivatedError)
	expect(gym.status).toBe("deactivated")
})

test("gym.activate() numa academia desativada muda o status para 'activated'", () => {
	const gymOrError = Gym.create({
		title: "Academia Central",
		latitude: -23.55,
		longitude: -46.63,
		cnpj: "11444777000161",
		address: "Rua das Flores, 123",
	})
	const gym = gymOrError.forceSuccess().value
	gym.deactivate()
	const result = gym.activate()
	expect(result.isSuccess()).toBe(true)
	expect(gym.status).toBe("activated")
})

test("gym.activate() numa academia já ativa retorna failure(GymAlreadyActivatedError)", () => {
	const gymOrError = Gym.create({
		title: "Academia Central",
		latitude: -23.55,
		longitude: -46.63,
		cnpj: "11444777000161",
		address: "Rua das Flores, 123",
	})
	const gym = gymOrError.forceSuccess().value
	const result = gym.activate()
	expect(result.isFailure()).toBe(true)
	expect(result.forceFailure().value).toBeInstanceOf(GymAlreadyActivatedError)
})
```

Adicionar os imports necessários no topo de `gym.test.ts` (`GymAlreadyDeactivatedError` de
`./error/gym-already-deactivated-error`, `GymAlreadyActivatedError` de
`./error/gym-already-activated-error`), mantendo os imports/estrutura já existentes no
arquivo.

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "Gym.create"`
Expected: FAIL — `gym.status` é `undefined` (a propriedade `status` ainda não existe na
entidade `Gym`) e `gym.deactivate`/`gym.activate` não são funções.

- **Step 3: Implementação mínima**

Estado atual de `apps/backend/src/gym/domain/gym.ts` (arquivo completo antes da mudança):
```typescript
import type { InvalidLatitudeError } from "@/shared/domain/error/invalid-latitude-error"
import type { InvalidLongitudeError } from "@/shared/domain/error/invalid-longitude-error"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { Id } from "@/shared/domain/value-object/id"
import type { InvalidNameLengthError } from "@/user/domain/error/invalid-name-length-error"
import { Name } from "@/user/domain/value-object/name"
import { Phone } from "@/user/domain/value-object/phone"

import type { InvalidCNPJError } from "./error/invalid-cnpj-error"
import { CNPJ } from "./value-object/CNPJ"

interface GymConstructor {
	id: Id
	cnpj: CNPJ
	title: Name
	description?: string
	phone: Phone
	coordinate: Coordinate
	address?: string
	imageKey?: string
}

export type GymCreateProps = Omit<
	GymConstructor,
	"id" | "coordinate" | "title" | "phone" | "cnpj"
> & {
	id?: string
	phone?: string
	title: string
	latitude: number
	longitude: number
	cnpj: string
	address: string
}

export type GymRestoreProps = Omit<
	GymConstructor,
	"id" | "coordinate" | "title" | "phone" | "cnpj"
> & {
	id: string
	phone?: string
	title: string
	latitude: number
	longitude: number
	cnpj: string
	address?: string
}

export class Gym {
	private readonly _id: Id
	private readonly _title: Name
	private readonly _description?: string
	private readonly _phone?: Phone
	private readonly _coordinate: Coordinate
	private readonly _cnpj: CNPJ
	private readonly _address?: string
	private readonly _imageKey?: string

	private constructor(gymProps: GymConstructor) {
		this._id = gymProps.id
		this._title = gymProps.title
		this._description = gymProps.description
		this._phone = gymProps.phone
		this._coordinate = gymProps.coordinate
		this._cnpj = gymProps.cnpj
		this._address = gymProps.address
		this._imageKey = gymProps.imageKey
	}

	public static create(
		gymProps: GymCreateProps,
	): Either<
		| InvalidNameLengthError
		| InvalidLatitudeError
		| InvalidLongitudeError
		| InvalidCNPJError,
		Gym
	> {
		const id = Id.create(gymProps.id)
		const nameOrError = Name.create(gymProps.title)
		if (nameOrError.isFailure()) return failure(nameOrError.value)
		const coordinateOrError = Coordinate.create({
			latitude: gymProps.latitude,
			longitude: gymProps.longitude,
		})
		if (coordinateOrError.isFailure()) return failure(coordinateOrError.value)
		const phoneOrError = Phone.create(gymProps.phone)
		if (phoneOrError.isFailure()) return failure(phoneOrError.value)
		const cnpjOrError = CNPJ.create(gymProps.cnpj)
		if (cnpjOrError.isFailure()) return failure(cnpjOrError.value)
		const gym = new Gym({
			...gymProps,
			id,
			coordinate: coordinateOrError.value,
			title: nameOrError.value,
			phone: phoneOrError.value,
			cnpj: cnpjOrError.value,
		})
		return success(gym)
	}

	public static restore(gymProps: GymRestoreProps): Gym {
		const id = Id.restore(gymProps.id)
		const title = Name.restore(gymProps.title)
		const phone = Phone.restore(gymProps.phone)
		const coordinate = Coordinate.restore({
			latitude: gymProps.latitude,
			longitude: gymProps.longitude,
		})
		const cnpj = CNPJ.restore(gymProps.cnpj)
		return new Gym({ ...gymProps, id, coordinate, title, phone, cnpj })
	}

	get id(): string { return this._id.value }
	get title(): string { return this._title.value }
	get description(): string | undefined { return this._description }
	get phone(): string | undefined { return this._phone?.value }
	get latitude(): number { return this._coordinate.latitude }
	get longitude(): number { return this._coordinate.longitude }
	get cnpj(): string { return this._cnpj.value }
	get address(): string | undefined { return this._address }
	get imageKey(): string | undefined { return this._imageKey }
}
```

Arquivo completo após a mudança:
```typescript
import type { InvalidLatitudeError } from "@/shared/domain/error/invalid-latitude-error"
import type { InvalidLongitudeError } from "@/shared/domain/error/invalid-longitude-error"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { Id } from "@/shared/domain/value-object/id"
import type { InvalidNameLengthError } from "@/user/domain/error/invalid-name-length-error"
import { Name } from "@/user/domain/value-object/name"
import { Phone } from "@/user/domain/value-object/phone"

import type { GymAlreadyActivatedError } from "./error/gym-already-activated-error"
import type { GymAlreadyDeactivatedError } from "./error/gym-already-deactivated-error"
import type { InvalidCNPJError } from "./error/invalid-cnpj-error"
import { CNPJ } from "./value-object/CNPJ"
import {
	GymStatus,
	GymStatusFactory,
	type GymStatusTypes,
} from "./value-object/gym-status"

interface GymConstructor {
	id: Id
	cnpj: CNPJ
	title: Name
	description?: string
	phone: Phone
	coordinate: Coordinate
	address?: string
	imageKey?: string
	status: GymStatusTypes
}

export type GymCreateProps = Omit<
	GymConstructor,
	"id" | "coordinate" | "title" | "phone" | "cnpj" | "status"
> & {
	id?: string
	phone?: string
	title: string
	latitude: number
	longitude: number
	cnpj: string
	address: string
}

export type GymRestoreProps = Omit<
	GymConstructor,
	"id" | "coordinate" | "title" | "phone" | "cnpj"
> & {
	id: string
	phone?: string
	title: string
	latitude: number
	longitude: number
	cnpj: string
	address?: string
	status: GymStatusTypes
}

export class Gym {
	private readonly _id: Id
	private readonly _title: Name
	private readonly _description?: string
	private readonly _phone?: Phone
	private readonly _coordinate: Coordinate
	private readonly _cnpj: CNPJ
	private readonly _address?: string
	private readonly _imageKey?: string
	private _status: GymStatus

	private constructor(gymProps: GymConstructor) {
		this._id = gymProps.id
		this._title = gymProps.title
		this._description = gymProps.description
		this._phone = gymProps.phone
		this._coordinate = gymProps.coordinate
		this._cnpj = gymProps.cnpj
		this._address = gymProps.address
		this._imageKey = gymProps.imageKey
		this._status = GymStatusFactory.create(this, gymProps.status)
	}

	public static create(
		gymProps: GymCreateProps,
	): Either<
		| InvalidNameLengthError
		| InvalidLatitudeError
		| InvalidLongitudeError
		| InvalidCNPJError,
		Gym
	> {
		const id = Id.create(gymProps.id)
		const nameOrError = Name.create(gymProps.title)
		if (nameOrError.isFailure()) return failure(nameOrError.value)
		const coordinateOrError = Coordinate.create({
			latitude: gymProps.latitude,
			longitude: gymProps.longitude,
		})
		if (coordinateOrError.isFailure()) return failure(coordinateOrError.value)
		const phoneOrError = Phone.create(gymProps.phone)
		if (phoneOrError.isFailure()) return failure(phoneOrError.value)
		const cnpjOrError = CNPJ.create(gymProps.cnpj)
		if (cnpjOrError.isFailure()) return failure(cnpjOrError.value)
		const gym = new Gym({
			...gymProps,
			id,
			coordinate: coordinateOrError.value,
			title: nameOrError.value,
			phone: phoneOrError.value,
			cnpj: cnpjOrError.value,
			status: "activated",
		})
		return success(gym)
	}

	public static restore(gymProps: GymRestoreProps): Gym {
		const id = Id.restore(gymProps.id)
		const title = Name.restore(gymProps.title)
		const phone = Phone.restore(gymProps.phone)
		const coordinate = Coordinate.restore({
			latitude: gymProps.latitude,
			longitude: gymProps.longitude,
		})
		const cnpj = CNPJ.restore(gymProps.cnpj)
		return new Gym({ ...gymProps, id, coordinate, title, phone, cnpj })
	}

	get id(): string { return this._id.value }
	get title(): string { return this._title.value }
	get description(): string | undefined { return this._description }
	get phone(): string | undefined { return this._phone?.value }
	get latitude(): number { return this._coordinate.latitude }
	get longitude(): number { return this._coordinate.longitude }
	get cnpj(): string { return this._cnpj.value }
	get address(): string | undefined { return this._address }
	get imageKey(): string | undefined { return this._imageKey }
	get status(): GymStatusTypes { return this._status.type }

	public _changeStatus(gymStatus: GymStatus): void {
		this._status = gymStatus
	}

	public deactivate(): Either<GymAlreadyDeactivatedError, void> {
		return this._status.deactivate()
	}

	public activate(): Either<GymAlreadyActivatedError, void> {
		return this._status.activate()
	}
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "Gym.create"`
Expected: PASS — todos os 5 casos de teste passam, incluindo os já existentes no arquivo.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/domain/gym.ts apps/backend/src/gym/domain/gym.test.ts
git commit -m "feat(gym): add status field and deactivate/activate to Gym entity"
```

## Critérios de Sucesso

- `Gym.create()` sempre resulta em `gym.status === "activated"`, independentemente do input
  do chamador — `status` não é um parâmetro aceito por `GymCreateProps` (FR-011).
- `Gym.restore()` exige `status: GymStatusTypes` como campo obrigatório em
  `GymRestoreProps`, refletindo fielmente o valor persistido.
- `gym.deactivate()` muda `gym.status` para `"deactivated"` e retorna `Either` de sucesso
  (FR-001); chamado uma segunda vez consecutiva retorna
  `failure(GymAlreadyDeactivatedError)` sem alterar o status.
- `gym.activate()` numa academia desativada muda `gym.status` para `"activated"` e retorna
  sucesso (FR-002); chamado numa academia já ativa retorna
  `failure(GymAlreadyActivatedError)`.
- `pnpm --filter backend test:run -- -t "Gym.create"` (e a suíte completa de `gym.test.ts`)
  passa sem regressão nos testes já existentes.
