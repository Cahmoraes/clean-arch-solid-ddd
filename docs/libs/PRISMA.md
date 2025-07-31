# Prisma ORM

## Visão Geral

Prisma é um ORM moderno e type-safe para Node.js e TypeScript. No projeto, é usado para gerenciar o banco de dados PostgreSQL com migrations, geração automática de tipos e client tipado.

## Configuração no Projeto

### Versão e Dependências
- **@prisma/client**: 6.11.0
- **prisma**: 6.11.0 (dev dependency)
- **Database**: PostgreSQL via Docker Compose

### Schema Principal
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  password     String
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
  status       UserStatus @default(pending)

  check_ins CheckIn[]
  subscriptions Subscription[]

  @@map("users")
}

model Gym {
  id          String  @id @default(cuid())
  title       String
  description String?
  phone       String?
  latitude    Decimal
  longitude   Decimal
  cnpj        String  @unique
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  check_ins CheckIn[]

  @@map("gyms")
}

model CheckIn {
  id           String    @id @default(cuid())
  user_id      String
  gym_id       String
  validated_at DateTime?
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)
  gym  Gym  @relation(fields: [gym_id], references: [id], onDelete: Cascade)

  @@map("check_ins")
}

model Subscription {
  id         String           @id @default(cuid())
  user_id    String
  type       SubscriptionType
  status     SubscriptionStatus @default(active)
  created_at DateTime         @default(now())
  updated_at DateTime         @updatedAt

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

enum UserStatus {
  pending
  active
  inactive

  @@map("user_status")
}

enum SubscriptionType {
  basic
  premium
  enterprise

  @@map("subscription_type")
}

enum SubscriptionStatus {
  active
  inactive
  cancelled
  expired

  @@map("subscription_status")
}
```

## Cliente Prisma

### 1. Configuração do Cliente
```typescript
// src/infra/database/prisma-client.ts
import { PrismaClient } from '@prisma/client'
import { env } from '@/infra/env'

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  }
})

// Tipos automáticos gerados
export type User = Prisma.UserGetPayload<{}>
export type Gym = Prisma.GymGetPayload<{}>
export type CheckIn = Prisma.CheckInGetPayload<{}>
```

### 2. Service de Banco
```typescript
// src/infra/database/prisma-service.ts
import { Injectable } from '@/infra/ioc'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ['query', 'error', 'warn'],
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }
}
```

## Repositories Pattern

### 1. Repository Base
```typescript
// src/domain/shared/repository.ts
export interface Repository<T> {
  create(data: T): Promise<T>
  findById(id: string): Promise<T | null>
  findMany(params?: any): Promise<T[]>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}
```

### 2. User Repository Implementation
```typescript
// src/infra/database/repositories/prisma-user-repository.ts
import { Injectable } from '@/infra/ioc'
import { UserRepository } from '@/domain/user/repositories'
import { PrismaService } from '../prisma-service'
import type { User, CreateUserDTO } from '@/domain/user/entities'

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDTO): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        status: 'pending'
      }
    })
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        check_ins: {
          include: {
            gym: true
          }
        },
        subscriptions: true
      }
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    })
  }

  async findMany(params: {
    skip?: number
    take?: number
    search?: string
  }): Promise<User[]> {
    return this.prisma.user.findMany({
      skip: params.skip,
      take: params.take,
      where: params.search ? {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } }
        ]
      } : undefined,
      orderBy: {
        created_at: 'desc'
      }
    })
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date()
      }
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    })
  }

  async countByEmail(email: string): Promise<number> {
    return this.prisma.user.count({
      where: { email }
    })
  }
}
```

## Queries Avançadas

### 1. Relacionamentos e Includes
```typescript
// Buscar usuário com check-ins e academias
const userWithCheckIns = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    check_ins: {
      include: {
        gym: {
          select: {
            id: true,
            title: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    }
  }
})

// Buscar academias próximas com aggregate
const nearbyGyms = await prisma.$queryRaw<Gym[]>`
  SELECT * FROM gyms
  WHERE (6371 * acos(cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(latitude)))) <= ${maxDistance}
`
```

### 2. Transações
```typescript
// Transação para check-in com validações
export class CheckInService {
  async checkIn(userId: string, gymId: string, coordinates: Coordinates) {
    return this.prisma.$transaction(async (tx) => {
      // Verificar se o usuário já fez check-in hoje
      const checkInToday = await tx.checkIn.findFirst({
        where: {
          user_id: userId,
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })

      if (checkInToday) {
        throw new Error('User already checked in today')
      }

      // Buscar dados da academia
      const gym = await tx.gym.findUnique({
        where: { id: gymId }
      })

      if (!gym) {
        throw new Error('Gym not found')
      }

      // Verificar distância (implementação simplificada)
      const distance = getDistanceBetweenCoordinates(
        coordinates,
        { latitude: gym.latitude.toNumber(), longitude: gym.longitude.toNumber() }
      )

      if (distance > MAX_DISTANCE_IN_KILOMETERS) {
        throw new Error('You are too far from the gym')
      }

      // Criar check-in
      return tx.checkIn.create({
        data: {
          user_id: userId,
          gym_id: gymId
        },
        include: {
          gym: {
            select: {
              title: true,
              latitude: true,
              longitude: true
            }
          }
        }
      })
    })
  }
}
```

### 3. Aggregations e Estatísticas
```typescript
// Estatísticas de check-ins por usuário
const userStats = await prisma.checkIn.groupBy({
  by: ['user_id'],
  where: {
    created_at: {
      gte: new Date(new Date().getFullYear(), 0, 1) // Início do ano
    }
  },
  _count: {
    id: true
  },
  _max: {
    created_at: true
  },
  orderBy: {
    _count: {
      id: 'desc'
    }
  }
})

// Count com condições
const activeUsers = await prisma.user.count({
  where: {
    status: 'active',
    check_ins: {
      some: {
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 dias
        }
      }
    }
  }
})
```

## Migrations

### 1. Estrutura de Migrations
```
prisma/migrations/
├── migration_lock.toml
├── 20250322181912_initial_schema/
│   └── migration.sql
├── 20250608180600_add_column_status_at_user/
│   └── migration.sql
├── 20250615161444_refactor_enum_user_status_to_lowercase/
│   └── migration.sql
├── 20250619183843_alter_table_gym_add_column_cnpj/
│   └── migration.sql
├── 20250722171552_create_subscription_model/
│   └── migration.sql
└── 20250722172155_modify_enum_to_lower_case/
    └── migration.sql
```

### 2. Comandos de Migration
```bash
# Gerar nova migration
npx prisma migrate dev --name add_new_feature

# Aplicar migrations em produção
npx prisma migrate deploy

# Reset do banco (desenvolvimento)
npx prisma migrate reset

# Verificar status das migrations
npx prisma migrate status
```

### 3. Exemplo de Migration SQL
```sql
-- 20250722171552_create_subscription_model/migration.sql
-- CreateEnum
CREATE TYPE "subscription_type" AS ENUM ('basic', 'premium', 'enterprise');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'inactive', 'cancelled', 'expired');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "subscription_type" NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Seeders e Dados de Teste

### 1. Seed Script
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Limpar dados existentes
  await prisma.checkIn.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.gym.deleteMany()
  await prisma.user.deleteMany()

  // Criar usuários
  const passwordHash = await hash('123456', 6)
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        password: passwordHash,
        status: 'active'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: passwordHash,
        status: 'active'
      }
    })
  ])

  // Criar academias
  const gyms = await Promise.all([
    prisma.gym.create({
      data: {
        title: 'JavaScript Gym',
        description: 'Melhor academia para devs JS',
        latitude: -27.2092052,
        longitude: -49.6401091,
        phone: '(47) 99999-9999',
        cnpj: '12345678000199'
      }
    }),
    prisma.gym.create({
      data: {
        title: 'TypeScript Fitness',
        description: 'Academia type-safe',
        latitude: -27.0610928,
        longitude: -49.5229501,
        phone: '(47) 88888-8888',
        cnpj: '98765432000188'
      }
    })
  ])

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### 2. Script de Seed no package.json
```json
{
  "scripts": {
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "npx prisma migrate reset --force && npm run db:seed"
  }
}
```

## Configuração de Ambiente

### 1. Variáveis de Ambiente
```env
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_DB=database_name
```

### 2. Docker Compose para PostgreSQL
```yaml
# compose.yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres-gym-api
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - gym-network

volumes:
  postgres_data:

networks:
  gym-network:
    driver: bridge
```

## Environment de Teste

### 1. Configuração Vitest + Prisma
```typescript
// test/setup-test.ts
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { env } from '@/infra/env'

const prisma = new PrismaClient()

function generateDatabaseURL(schemaId: string) {
  if (!env.DATABASE_URL) {
    throw new Error('Please provide a DATABASE_URL environment variable.')
  }

  const url = new URL(env.DATABASE_URL)
  url.searchParams.set('schema', schemaId)
  return url.toString()
}

const schemaId = randomUUID()

beforeAll(async () => {
  const databaseURL = generateDatabaseURL(schemaId)
  process.env.DATABASE_URL = databaseURL

  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseURL,
    },
  })
})

afterAll(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
  await prisma.$disconnect()
})
```

## Comandos Úteis

```bash
# Gerar cliente Prisma
npx prisma generate

# Visualizar banco no Prisma Studio
npx prisma studio

# Format schema
npx prisma format

# Validar schema
npx prisma validate

# Deploy migrations
npx prisma migrate deploy

# Reset desenvolvimento
npx prisma migrate reset

# Pull schema do banco
npx prisma db pull

# Push schema para banco (sem migration)
npx prisma db push
```

## Links de Referência

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
