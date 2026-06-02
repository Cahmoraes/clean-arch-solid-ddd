# Task 3: Coordinate compartilhado em shared/domain com distanceTo(); deletar DistanceCalculator

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** N/A

## Visão Geral

A classe `Coordinate` vive no contexto Check-In, mas é importada pelo contexto Gym (entidade, interface de repository, use case e adapters) — vazamento entre bounded contexts. Além disso, o cálculo Haversine existe duplicado em `Distance.value` e em `DistanceCalculator` (este último usado só pelo `InMemoryGymRepository`).

Esta tarefa: move `Coordinate` (+ erros de latitude/longitude) para `shared/domain`, adiciona `distanceTo(other)` como única fonte do Haversine, faz `Distance` delegar, atualiza todos os importadores e deleta `DistanceCalculator`.

## Arquivos

- Create: `apps/backend/src/shared/domain/error/invalid-latitude-error.ts`
- Create: `apps/backend/src/shared/domain/error/invalid-longitude-error.ts`
- Create: `apps/backend/src/shared/domain/value-object/coordinate.ts`
- Create: `apps/backend/src/shared/domain/value-object/coordinate.test.ts`
- Modify: `apps/backend/src/check-in/domain/value-object/distance.ts`
- Modify: `apps/backend/src/gym/domain/gym.ts`
- Modify: `apps/backend/src/gym/application/repository/gym-repository.ts`
- Modify: `apps/backend/src/gym/application/use-case/fetch-nearby-gym.usecase.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`
- Delete: `apps/backend/src/check-in/domain/value-object/coordinate.ts`
- Delete: `apps/backend/src/check-in/domain/value-object/coordinate.test.ts`
- Delete: `apps/backend/src/check-in/domain/error/invalid-latitude-error.ts`
- Delete: `apps/backend/src/check-in/domain/error/invalid-longitude-error.ts`
- Delete: `apps/backend/src/check-in/domain/service/distance-calculator.ts`
- Delete: `apps/backend/src/check-in/domain/service/distance-calculator.test.ts`

### Conformidade com as Skills Padrão

- refactoring: Move Class + Move Method (Haversine consolidado em Coordinate.distanceTo)
- test-antipatterns: testes verificam comportamento (distância calculada), não implementação
- typescript-advanced: imports com extensão `.js` (ESM), alias `@/`

## Passos

Todos os comandos rodam a partir da raiz do monorepo. **Atenção à convenção do projeto:** imports internos usam extensão `.js` e alias `@/` para `src/`.

- **Step 1: Criar os erros de latitude/longitude em shared/domain/error**

Create `apps/backend/src/shared/domain/error/invalid-latitude-error.ts`:

```typescript
export class InvalidLatitudeError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Invalid latitude", errorOptions)
		this.name = "InvalidLatitudeError"
	}
}
```

Create `apps/backend/src/shared/domain/error/invalid-longitude-error.ts`:

```typescript
export class InvalidLongitudeError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Invalid longitude", errorOptions)
		this.name = "InvalidLongitudeError"
	}
}
```

(Conteúdo idêntico aos atuais em `check-in/domain/error/` — eles ganham `kind` na task-06, não aqui.)

- **Step 2: Escrever o teste do Coordinate compartilhado (incluindo distanceTo) — deve falhar**

Create `apps/backend/src/shared/domain/value-object/coordinate.test.ts`:

```typescript
import { InvalidLatitudeError } from "../error/invalid-latitude-error"
import { InvalidLongitudeError } from "../error/invalid-longitude-error"
import { Coordinate } from "./coordinate"

describe("Coordinate", () => {
	test("Deve criar uma coordenada válida", () => {
		const result = Coordinate.create({ latitude: -23.55, longitude: -46.63 })
		expect(result.isSuccess()).toBe(true)
		const coordinate = result.forceSuccess().value
		expect(coordinate.latitude).toBe(-23.55)
		expect(coordinate.longitude).toBe(-46.63)
	})

	test("Não deve criar coordenada com latitude inválida", () => {
		const result = Coordinate.create({ latitude: 91, longitude: 0 })
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidLatitudeError)
	})

	test("Não deve criar coordenada com longitude inválida", () => {
		const result = Coordinate.create({ latitude: 0, longitude: 181 })
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidLongitudeError)
	})

	test("Deve restaurar coordenada sem validação", () => {
		const coordinate = Coordinate.restore({ latitude: 10, longitude: 20 })
		expect(coordinate.latitude).toBe(10)
		expect(coordinate.longitude).toBe(20)
	})

	describe("distanceTo", () => {
		test("Deve retornar 0 para coordenadas idênticas", () => {
			const a = Coordinate.restore({ latitude: -23.55, longitude: -46.63 })
			const b = Coordinate.restore({ latitude: -23.55, longitude: -46.63 })
			expect(a.distanceTo(b)).toBe(0)
		})

		test("Deve calcular a distância São Paulo → Rio de Janeiro (~360km)", () => {
			const saoPaulo = Coordinate.restore({
				latitude: -23.5505,
				longitude: -46.6333,
			})
			const rioDeJaneiro = Coordinate.restore({
				latitude: -22.9068,
				longitude: -43.1729,
			})
			const distance = saoPaulo.distanceTo(rioDeJaneiro)
			expect(distance).toBeGreaterThan(350)
			expect(distance).toBeLessThan(370)
		})

		test("Deve ser simétrica: a.distanceTo(b) === b.distanceTo(a)", () => {
			const a = Coordinate.restore({ latitude: -27.0747279, longitude: -49.4889672 })
			const b = Coordinate.restore({ latitude: -27.2092052, longitude: -49.6401091 })
			expect(a.distanceTo(b)).toBeCloseTo(b.distanceTo(a), 10)
		})
	})
})
```

- **Step 3: Rodar o teste para verificar que falha**

Run: `pnpm --filter backend test:run -- -t "Coordinate"`
Expected: FAIL — `Cannot find module './coordinate'` (o arquivo ainda não existe em shared).

- **Step 4: Criar a classe Coordinate em shared/domain/value-object**

Create `apps/backend/src/shared/domain/value-object/coordinate.ts`:

```typescript
import { InvalidLatitudeError } from "../error/invalid-latitude-error"
import { InvalidLongitudeError } from "../error/invalid-longitude-error"
import { type Either, failure, success } from "./either"

export interface CoordinateCreate {
	latitude: number
	longitude: number
}

const MAX_LATITUDE = 90
const MIN_LATITUDE = -90
const MAX_LONGITUDE = 180
const MIN_LONGITUDE = -180

export class Coordinate {
	private _latitude: number
	private _longitude: number

	private constructor(props: CoordinateCreate) {
		this._latitude = props.latitude
		this._longitude = props.longitude
	}

	public static create(
		props: CoordinateCreate,
	): Either<InvalidLatitudeError | InvalidLongitudeError, Coordinate> {
		const coordsOrError = Coordinate.validate(props)
		if (coordsOrError.isFailure()) return failure(coordsOrError.value)
		const coordinate = new Coordinate(coordsOrError.value)
		return success(coordinate)
	}

	public static validate(
		props: CoordinateCreate,
	): Either<Error, CoordinateCreate> {
		if (props.latitude < MIN_LATITUDE || props.latitude > MAX_LATITUDE) {
			return failure(new InvalidLatitudeError())
		}
		if (props.longitude < MIN_LONGITUDE || props.longitude > MAX_LONGITUDE) {
			return failure(new InvalidLongitudeError())
		}
		return success(props)
	}

	public static restore(props: CoordinateCreate) {
		return new Coordinate(props)
	}

	get latitude(): number {
		return this._latitude
	}

	get longitude(): number {
		return this._longitude
	}

	/**
	 * Distância geográfica em quilômetros (Haversine).
	 * Única fonte de verdade do cálculo de distância no backend.
	 */
	public distanceTo(other: Coordinate): number {
		if (
			this._latitude === other.latitude &&
			this._longitude === other.longitude
		) {
			return 0
		}
		const fromRadian = (Math.PI * this._latitude) / 180
		const toRadian = (Math.PI * other.latitude) / 180
		const theta = this._longitude - other.longitude
		const radTheta = (Math.PI * theta) / 180
		let dist =
			Math.sin(fromRadian) * Math.sin(toRadian) +
			Math.cos(fromRadian) * Math.cos(toRadian) * Math.cos(radTheta)
		if (dist > 1) {
			dist = 1
		}
		dist = Math.acos(dist)
		dist = (dist * 180) / Math.PI
		dist = dist * 60 * 1.1515
		dist = dist * 1.609344
		return dist
	}
}
```

- **Step 5: Rodar o teste para verificar que passa**

Run: `pnpm --filter backend test:run -- -t "Coordinate"`
Expected: PASS — todos os testes do Step 2 (criação, validação, restore, distanceTo).

- **Step 6: Fazer Distance delegar para Coordinate.distanceTo**

Em `apps/backend/src/check-in/domain/value-object/distance.ts`:

1. Trocar o import (linha 8): `import { Coordinate } from "./coordinate"` → `import { Coordinate } from "@/shared/domain/value-object/coordinate"`
2. Substituir o getter `value` (linhas ~55-77) pela delegação:

```typescript
	get value(): number {
		return this._from.distanceTo(this._to)
	}
```

O restante do arquivo (interface `CoordinateDTO`, `create()`, getters `from`/`to`) permanece intacto.

- **Step 7: Atualizar os importadores do contexto Gym**

Em `apps/backend/src/gym/domain/gym.ts` (linhas 1-3):

```typescript
// ANTES
import type { InvalidLatitudeError } from "@/check-in/domain/error/invalid-latitude-error"
import type { InvalidLongitudeError } from "@/check-in/domain/error/invalid-longitude-error"
import { Coordinate } from "@/check-in/domain/value-object/coordinate"

// DEPOIS
import type { InvalidLatitudeError } from "@/shared/domain/error/invalid-latitude-error"
import type { InvalidLongitudeError } from "@/shared/domain/error/invalid-longitude-error"
import { Coordinate } from "@/shared/domain/value-object/coordinate"
```

Em `apps/backend/src/gym/application/repository/gym-repository.ts` (linha 1):

```typescript
// ANTES
import type { Coordinate } from "@/check-in/domain/value-object/coordinate"
// DEPOIS
import type { Coordinate } from "@/shared/domain/value-object/coordinate"
```

Em `apps/backend/src/gym/application/use-case/fetch-nearby-gym.usecase.ts` (linhas 4-5):

```typescript
// ANTES
import type { InvalidLongitudeError } from "@/check-in/domain/error/invalid-longitude-error"
import { Coordinate } from "@/check-in/domain/value-object/coordinate"
// DEPOIS
import type { InvalidLongitudeError } from "@/shared/domain/error/invalid-longitude-error"
import { Coordinate } from "@/shared/domain/value-object/coordinate"
```

(Se o use case também importar `InvalidLatitudeError`, atualizar igualmente.)

Em `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts` (linha ~3):

```typescript
// ANTES
import type { Coordinate } from "@/check-in/domain/value-object/coordinate"
// DEPOIS
import type { Coordinate } from "@/shared/domain/value-object/coordinate"
```

- **Step 8: Substituir DistanceCalculator no InMemoryGymRepository**

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`:

1. Remover o import de `DistanceCalculator` e atualizar o de `Coordinate` (linhas ~3-4):

```typescript
// ANTES
import { DistanceCalculator } from "@/check-in/domain/service/distance-calculator"
import type { Coordinate } from "@/check-in/domain/value-object/coordinate"

// DEPOIS
import { Coordinate } from "@/shared/domain/value-object/coordinate"
```

(O import deixa de ser `import type` porque agora chamamos `Coordinate.restore()`.)

2. Atualizar `fetchNearbyCoord` (linhas ~55-64):

```typescript
// ANTES
	public async fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]> {
		const nearbyGyms = this.gyms.filter((gym) => {
			const distance = DistanceCalculator.distanceBetweenCoordinates(
				{ latitude: coordinate.latitude, longitude: coordinate.longitude },
				{ latitude: gym.latitude, longitude: gym.longitude },
			)
			return distance <= InMemoryGymRepository.KILOMETER
		})
		return nearbyGyms.toArray()
	}

// DEPOIS
	public async fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]> {
		const nearbyGyms = this.gyms.filter((gym) => {
			const gymCoordinate = Coordinate.restore({
				latitude: gym.latitude,
				longitude: gym.longitude,
			})
			const distance = coordinate.distanceTo(gymCoordinate)
			return distance <= InMemoryGymRepository.KILOMETER
		})
		return nearbyGyms.toArray()
	}
```

- **Step 9: Verificar que não há mais importadores dos arquivos antigos**

Run: `grep -rn "check-in/domain/value-object/coordinate\|check-in/domain/error/invalid-latitude\|check-in/domain/error/invalid-longitude\|distance-calculator" apps/backend/src apps/backend/test --include="*.ts" | grep -v "check-in/domain/value-object/coordinate.test\|check-in/domain/service/distance-calculator"`
Expected: nenhuma linha (apenas os próprios arquivos a deletar). Se houver importador restante, atualizá-lo para `@/shared/domain/...` antes de prosseguir.

- **Step 10: Deletar os arquivos antigos**

```bash
rm apps/backend/src/check-in/domain/value-object/coordinate.ts
rm apps/backend/src/check-in/domain/value-object/coordinate.test.ts
rm apps/backend/src/check-in/domain/error/invalid-latitude-error.ts
rm apps/backend/src/check-in/domain/error/invalid-longitude-error.ts
rm apps/backend/src/check-in/domain/service/distance-calculator.ts
rm apps/backend/src/check-in/domain/service/distance-calculator.test.ts
```

Se o diretório `apps/backend/src/check-in/domain/service/` ficar vazio, removê-lo também: `rmdir apps/backend/src/check-in/domain/service`

- **Step 11: Rodar a validação completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: biome zero issues, tsc zero erros, todos os testes unitários PASS (incluindo distance.test.ts que agora exercita a delegação, e os testes de check-in/gym que usam coordenadas).

Run: `pnpm --filter backend test:business-flow && pnpm --filter backend build && pnpm --filter backend fit:validate-dependencies`
Expected: business-flow PASS, build ok, dependency-cruiser zero violações (shared/domain pode ser importado por qualquer contexto).

- **Step 12: Commit**

```bash
git add -A apps/backend/src
git commit -m "refactor(shared): move Coordinate to shared/domain with distanceTo(), remove DistanceCalculator"
```

## Critérios de Sucesso

- `Coordinate` vive em `shared/domain/value-object/` com método `distanceTo()` testado
- `Distance.value` delega para `Coordinate.distanceTo()` — Haversine existe em UM único lugar
- Contexto Gym não importa nada de `check-in/domain`
- `DistanceCalculator` e seu teste deletados
- Validação completa passa 100% (biome, tsc, test:run, test:business-flow, build, fit:validate-dependencies)
