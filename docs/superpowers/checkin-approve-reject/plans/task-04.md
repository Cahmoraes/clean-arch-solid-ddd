# Task 4: Atualizar repositório: interface + InMemory [RF-005]

**Status:** DONE
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Atualizar a interface `CheckInRepository` para incluir `"rejected"` no tipo `CheckInStatus`, e corrigir o `InMemoryCheckInRepository` para usar `checkIn.status` (em vez do `isValidated` removido) e para o `save()` preservar o estado corretamente.

**Depende de:** Task 3

## Arquivos

- Modify: `apps/backend/src/check-in/application/repository/check-in-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.ts`

## Passos

- [ ] **Step 1: Atualizar CheckInStatus na interface do repositório**

Em `apps/backend/src/check-in/application/repository/check-in-repository.ts`, atualizar o tipo `CheckInStatus`:

```typescript
import type { CheckIn } from "@/check-in/domain/check-in"

export interface SaveResponse {
	id: string
}

export type CheckInStatus = "pending" | "validated" | "rejected"

export interface FindManyInput {
	page: number
	status?: CheckInStatus
	userId?: string
}

export interface FindManyOutput {
	items: CheckIn[]
	total: number
}

export interface CheckInRepository {
	save(checkIn: CheckIn): Promise<SaveResponse>
	checkOfById(id: string): Promise<CheckIn | null>
	onSameDateOfUserId(userId: string, date: Date): Promise<boolean>
	findMany(input: FindManyInput): Promise<FindManyOutput>
	withTransaction<TX extends object>(object: TX): CheckInRepository
}
```

- [ ] **Step 2: Atualizar InMemoryCheckInRepository**

Substituir o conteúdo completo de `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.ts`:

```typescript
import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"

import type {
	CheckInRepository,
	FindManyInput,
	FindManyOutput,
	SaveResponse,
} from "@/check-in/application/repository/check-in-repository"
import { CheckIn } from "@/check-in/domain/check-in"
import { env } from "@/shared/infra/env"

@injectable()
export class InMemoryCheckInRepository implements CheckInRepository {
	public ITEMS_PER_PAGE = 20

	public checkIns = new ExtendedSet<CheckIn>()

	public withTransaction(): CheckInRepository {
		return this
	}

	public async save(checkIn: CheckIn): Promise<SaveResponse> {
		const existing = this.checkIns.find((item) => item.id === checkIn.id)
		if (existing) {
			this.checkIns.delete(existing)
		}
		this.checkIns.add(checkIn)
		return {
			id: checkIn.id,
		}
	}

	public async checkOfById(id: string): Promise<CheckIn | null> {
		return this.checkIns.find((checkIn) => checkIn.id === id) ?? null
	}

	public async onSameDateOfUserId(
		userId: string,
		date: Date,
	): Promise<boolean> {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)
		const endOfDay = new Date(date)
		endOfDay.setHours(23, 59, 59, 999)
		return this.checkIns.some((checkIn) => {
			const checkInDate = checkIn.createdAt
			const isSameUserId = checkIn.userId === userId
			const checkInOnRangeDate =
				checkInDate >= startOfDay && checkInDate <= endOfDay
			return isSameUserId && checkInOnRangeDate
		})
	}

	public async findMany(input: FindManyInput): Promise<FindManyOutput> {
		let filtered = this.checkIns.toArray()
		if (input.userId) {
			filtered = filtered.filter((checkIn) => checkIn.userId === input.userId)
		}
		if (input.status) {
			filtered = filtered.filter((checkIn) => checkIn.status === input.status)
		}
		const total = filtered.length
		const start = (input.page - 1) * env.ITEMS_PER_PAGE
		const items = filtered.slice(start, start + env.ITEMS_PER_PAGE)
		return { items, total }
	}
}
```

> **Nota:** O `save()` agora substitui o item existente pelo ID (upsert), corrigindo o bug anterior onde o check-in era sempre re-criado com `isValidated: false`. O `findMany()` agora usa `checkIn.status` em vez de `checkIn.isValidated`.

- [ ] **Step 3: Rodar todos os testes**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 4: Type-check**

```bash
pnpm --filter backend tsc:check
```

Esperado: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/check-in/application/repository/check-in-repository.ts \
        apps/backend/src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.ts
git commit -m "feat(check-in): update repository interface and in-memory impl for rejected status
```

## Critérios de Sucesso

- `CheckInStatus` inclui `"rejected"` no tipo
- `InMemoryCheckInRepository.save()` faz upsert por ID (não duplica check-ins ao atualizar)
- `findMany({ status: "rejected" })` filtra corretamente
- Todos os testes passam
