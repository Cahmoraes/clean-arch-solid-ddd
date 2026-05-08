# Task 6: Atualizar PrismaCheckInRepository [RF-005]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Atualizar o `PrismaCheckInRepository` para persistir e recuperar `rejected_at`, e filtrar por `"rejected"` no `findMany`. O `save()` agora também escreve `rejected_at`.

**Depende de:** Task 4, Task 5

## Arquivos

- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts`

## Passos

- [ ] **Step 1: Atualizar o PrismaCheckInRepository**

Substituir o conteúdo completo de `apps/backend/src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts`:

```typescript
import { inject, injectable } from "inversify"
import type {
	CheckInRepository,
	FindManyInput,
	FindManyOutput,
	SaveResponse,
} from "@/check-in/application/repository/check-in-repository"
import { CheckIn } from "@/check-in/domain/check-in"
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work"
import { env } from "@/shared/infra/env"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

interface CreateCheckInProps {
	id: string
	created_at: Date
	validated_at: Date | null
	rejected_at: Date | null
	user_id: string
	gym_id: string
	latitude: number
	longitude: number
}

@injectable()
export class PrismaCheckInRepository implements CheckInRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(
		prismaClient: TX,
	): CheckInRepository {
		if (PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			return new PrismaCheckInRepository(prismaClient)
		}
		throw new InvalidTransactionInstance(prismaClient)
	}

	public async save(checkIn: CheckIn): Promise<SaveResponse> {
		const result = await this.prismaClient.checkIn.upsert({
			where: { id: checkIn.id },
			create: {
				id: checkIn.id,
				gym_id: checkIn.gymId,
				user_id: checkIn.userId,
				validated_at: checkIn.validatedAt ?? null,
				rejected_at: checkIn.rejectedAt ?? null,
				latitude: checkIn.latitude,
				longitude: checkIn.longitude,
			},
			update: {
				validated_at: checkIn.validatedAt ?? null,
				rejected_at: checkIn.rejectedAt ?? null,
			},
			select: { id: true },
		})
		return { id: result.id }
	}

	public async checkOfById(id: string): Promise<CheckIn | null> {
		const checkInData = await this.prismaClient.checkIn.findUnique({
			where: { id },
		})
		if (!checkInData) return null
		return this.createCheckIn({
			...checkInData,
			latitude: checkInData.latitude.toNumber(),
			longitude: checkInData.longitude.toNumber(),
		})
	}

	private createCheckIn(props: CreateCheckInProps) {
		return CheckIn.restore({
			id: props.id,
			gymId: props.gym_id,
			userId: props.user_id,
			createdAt: props.created_at,
			validatedAt: props.validated_at ?? undefined,
			rejectedAt: props.rejected_at ?? undefined,
			userLatitude: props.latitude,
			userLongitude: props.longitude,
		})
	}

	public async onSameDateOfUserId(
		userId: string,
		date: Date,
	): Promise<boolean> {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)
		const endOfDay = new Date(date)
		endOfDay.setHours(23, 59, 59, 999)
		const checkInOnSameDate = await this.prismaClient.checkIn.count({
			where: {
				user_id: userId,
				created_at: {
					gte: startOfDay,
					lt: endOfDay,
				},
			},
		})
		return checkInOnSameDate > 0
	}

	public async findMany(input: FindManyInput): Promise<FindManyOutput> {
		const where = this.buildWhere(input)
		const [checkInData, total] = await Promise.all([
			this.prismaClient.checkIn.findMany({
				where,
				skip: (input.page - 1) * env.ITEMS_PER_PAGE,
				take: env.ITEMS_PER_PAGE,
				orderBy: { created_at: "desc" },
			}),
			this.prismaClient.checkIn.count({ where }),
		])
		const items = checkInData.map((data) =>
			this.createCheckIn({
				...data,
				latitude: data.latitude.toNumber(),
				longitude: data.longitude.toNumber(),
			}),
		)
		return { items, total }
	}

	private buildWhere(input: FindManyInput): Prisma.CheckInWhereInput {
		const where: Prisma.CheckInWhereInput = {}
		if (input.userId) {
			where.user_id = input.userId
		}
		if (input.status === "pending") {
			where.validated_at = null
			where.rejected_at = null
		}
		if (input.status === "validated") {
			where.validated_at = { not: null }
			where.rejected_at = null
		}
		if (input.status === "rejected") {
			where.rejected_at = { not: null }
		}
		return where
	}
}
```

> **Nota:** O `save()` foi alterado para `upsert` — cria se não existir, atualiza `validated_at` e `rejected_at` se já existir. O `buildWhere` para `"pending"` agora garante que `rejected_at` também seja `null`.

- [ ] **Step 2: Rodar os testes Prisma (se disponível)**

```bash
pnpm --filter backend test:e2e:prisma
```

Se o ambiente de banco estiver disponível, esperado: todos os testes passam.

- [ ] **Step 3: Type-check**

```bash
pnpm --filter backend tsc:check
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts
git commit -m "feat(check-in): update PrismaCheckInRepository to persist rejected_at
```

## Critérios de Sucesso

- `save()` usa `upsert` e persiste `rejected_at`
- `checkOfById()` popula `rejectedAt` na entidade restaurada
- `findMany({ status: "pending" })` filtra `validated_at IS NULL AND rejected_at IS NULL`
- `findMany({ status: "validated" })` filtra `validated_at IS NOT NULL AND rejected_at IS NULL`
- `findMany({ status: "rejected" })` filtra `rejected_at IS NOT NULL`
- 0 erros de TypeScript
