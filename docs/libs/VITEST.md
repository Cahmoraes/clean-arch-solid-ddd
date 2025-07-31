# Vitest

## Visão Geral

Vitest é um framework de testes moderno e extremamente rápido, desenvolvido pela equipe do Vite. No projeto, é usado para testes unitários, de integração e end-to-end, com suporte nativo ao TypeScript e ESM.

## Configuração no Projeto

### Versão e Dependências
- **vitest**: 2.1.8
- **@vitest/ui**: 2.1.8 (interface web para testes)
- **vite-tsconfig-paths**: 5.1.5 (resolução de paths)

### Configuração Principal
```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    environmentOptions: {},
    setupFiles: ['./test/setup-test.ts'],
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**'
      ]
    }
  }
})
```

### Configurações Específicas por Domínio
```typescript
// vite.config.app-domain.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.{e2e,integration}.test.ts'],
    environment: 'node',
    globals: true
  }
})

// vite.config.business-flow.ts
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['test/business-flow/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup-test.ts']
  }
})

// vite.config.fitness.ts
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['test/fitness-function/**/*.test.ts'],
    environment: 'node',
    globals: true
  }
})
```

## Setup de Testes

### 1. Setup Global
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

  // Deploy migrations para o schema de teste
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

// Limpar dados entre testes
afterEach(async () => {
  await prisma.checkIn.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.gym.deleteMany()
  await prisma.user.deleteMany()
})
```

### 2. Factories de Teste
```typescript
// test/factory/user-factory.ts
import { hash } from 'bcryptjs'
import { prisma } from '@/infra/database'

interface CreateUserOptions {
  name?: string
  email?: string
  password?: string
  status?: 'pending' | 'active' | 'inactive'
}

export async function createUser(options: CreateUserOptions = {}) {
  const passwordHash = await hash(options.password || '123456', 6)

  return prisma.user.create({
    data: {
      name: options.name || 'John Doe',
      email: options.email || `user-${Date.now()}@example.com`,
      password: passwordHash,
      status: options.status || 'active'
    }
  })
}

// test/factory/gym-factory.ts
interface CreateGymOptions {
  title?: string
  description?: string
  latitude?: number
  longitude?: number
  cnpj?: string
}

export async function createGym(options: CreateGymOptions = {}) {
  return prisma.gym.create({
    data: {
      title: options.title || 'JavaScript Gym',
      description: options.description || 'Academia para desenvolvedores',
      latitude: options.latitude || -27.2092052,
      longitude: options.longitude || -49.6401091,
      phone: '(47) 99999-9999',
      cnpj: options.cnpj || `${Date.now()}000199`
    }
  })
}
```

## Testes Unitários

### 1. Teste de Serviço
```typescript
// src/application/user/create-user.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { hash } from 'bcryptjs'
import { CreateUserService } from './create-user-service'
import { InMemoryUserRepository } from '@/test/repositories'
import { UserAlreadyExistsError } from './errors'

describe('Create User Service', () => {
  let userRepository: InMemoryUserRepository
  let createUserService: CreateUserService

  beforeEach(() => {
    userRepository = new InMemoryUserRepository()
    createUserService = new CreateUserService(userRepository)
  })

  it('should be able to create a new user', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: '123456'
    }

    const user = await createUserService.execute(userData)

    expect(user).toHaveProperty('id')
    expect(user.email).toBe('john@example.com')
    expect(user.password).not.toBe('123456') // deve estar hasheada
  })

  it('should hash user password upon creation', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: '123456'
    }

    const user = await createUserService.execute(userData)
    const isPasswordCorrectlyHashed = await compare('123456', user.password)

    expect(isPasswordCorrectlyHashed).toBe(true)
  })

  it('should not be able to create user with same email twice', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: '123456'
    }

    await createUserService.execute(userData)

    await expect(() =>
      createUserService.execute(userData)
    ).rejects.toBeInstanceOf(UserAlreadyExistsError)
  })
})
```

### 2. Teste de Repository In-Memory
```typescript
// test/repositories/in-memory-user-repository.ts
import { User, CreateUserDTO } from '@/domain/user/entities'
import { UserRepository } from '@/domain/user/repositories'

export class InMemoryUserRepository implements UserRepository {
  private users: User[] = []

  async create(data: CreateUserDTO): Promise<User> {
    const user: User = {
      id: `user-${this.users.length + 1}`,
      name: data.name,
      email: data.email,
      password: data.password,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }

    this.users.push(user)
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null
  }

  async findMany(): Promise<User[]> {
    return this.users
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const userIndex = this.users.findIndex(user => user.id === id)
    
    if (userIndex === -1) {
      throw new Error('User not found')
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...data,
      updated_at: new Date()
    }

    return this.users[userIndex]
  }

  async delete(id: string): Promise<void> {
    const userIndex = this.users.findIndex(user => user.id === id)
    
    if (userIndex === -1) {
      throw new Error('User not found')
    }

    this.users.splice(userIndex, 1)
  }
}
```

## Testes de Integração

### 1. Teste de Controller
```typescript
// src/infra/controller/user-controller.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app } from '@/bootstrap/server-build'
import { createUser } from '@/test/factory'

describe('User Controller (Integration)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123456'
      }
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'John Doe',
        email: 'john@example.com'
      })
    )
  })

  it('should return 400 when trying to create user with invalid data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: {
        name: '',
        email: 'invalid-email',
        password: '123' // muito curta
      }
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual(
      expect.objectContaining({
        message: 'Validation error'
      })
    )
  })

  it('should return 409 when trying to create user with existing email', async () => {
    const existingUser = await createUser({
      email: 'existing@example.com'
    })

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: {
        name: 'John Doe',
        email: 'existing@example.com',
        password: '123456'
      }
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual(
      expect.objectContaining({
        message: 'User with same email already exists'
      })
    )
  })
})
```

### 2. Teste de Autenticação
```typescript
// src/infra/controller/auth-controller.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app } from '@/bootstrap/server-build'
import { createUser } from '@/test/factory'

describe('Authentication (Integration)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to authenticate user', async () => {
    await createUser({
      email: 'john@example.com',
      password: '123456'
    })

    const response = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: {
        email: 'john@example.com',
        password: '123456'
      }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String)
      })
    )
    expect(response.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'refreshToken'
        })
      ])
    )
  })

  it('should be able to refresh token', async () => {
    const user = await createUser({
      email: 'jane@example.com',
      password: '123456'
    })

    // Fazer login para obter refresh token
    const authResponse = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: {
        email: 'jane@example.com',
        password: '123456'
      }
    })

    const cookies = authResponse.cookies
    const refreshTokenCookie = cookies.find(
      cookie => cookie.name === 'refreshToken'
    )

    // Usar refresh token
    const refreshResponse = await app.inject({
      method: 'PATCH',
      url: '/token/refresh',
      cookies: {
        refreshToken: refreshTokenCookie!.value
      }
    })

    expect(refreshResponse.statusCode).toBe(200)
    expect(refreshResponse.json()).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String)
      })
    )
  })
})
```

## Testes End-to-End

### 1. Fluxo Completo de Check-in
```typescript
// test/business-flow/check-in-flow.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app } from '@/bootstrap/server-build'
import { createUser, createGym } from '@/test/factory'

describe('Check-in Flow (E2E)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should complete full check-in flow', async () => {
    // 1. Criar usuário
    const user = await createUser({
      email: 'user@example.com',
      password: '123456',
      status: 'active'
    })

    // 2. Fazer login
    const authResponse = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: {
        email: 'user@example.com',
        password: '123456'
      }
    })

    const { accessToken } = authResponse.json()

    // 3. Criar academia
    const gym = await createGym({
      title: 'Test Gym',
      latitude: -27.2092052,
      longitude: -49.6401091
    })

    // 4. Fazer check-in
    const checkInResponse = await app.inject({
      method: 'POST',
      url: `/gyms/${gym.id}/check-ins`,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      payload: {
        latitude: -27.2092052,
        longitude: -49.6401091
      }
    })

    expect(checkInResponse.statusCode).toBe(201)
    expect(checkInResponse.json()).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        user_id: user.id,
        gym_id: gym.id,
        created_at: expect.any(String)
      })
    )

    // 5. Verificar histórico de check-ins
    const historyResponse = await app.inject({
      method: 'GET',
      url: '/check-ins/history',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    })

    expect(historyResponse.statusCode).toBe(200)
    expect(historyResponse.json().checkIns).toHaveLength(1)
  })

  it('should not allow check-in twice in same day', async () => {
    const user = await createUser({
      email: 'user2@example.com',
      password: '123456',
      status: 'active'
    })

    const authResponse = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: {
        email: 'user2@example.com',
        password: '123456'
      }
    })

    const { accessToken } = authResponse.json()
    const gym = await createGym()

    // Primeiro check-in
    await app.inject({
      method: 'POST',
      url: `/gyms/${gym.id}/check-ins`,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      payload: {
        latitude: -27.2092052,
        longitude: -49.6401091
      }
    })

    // Segundo check-in (deve falhar)
    const secondCheckInResponse = await app.inject({
      method: 'POST',
      url: `/gyms/${gym.id}/check-ins`,
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      payload: {
        latitude: -27.2092052,
        longitude: -49.6401091
      }
    })

    expect(secondCheckInResponse.statusCode).toBe(400)
    expect(secondCheckInResponse.json()).toEqual(
      expect.objectContaining({
        message: 'User already checked in today'
      })
    )
  })
})
```

## Testes de Performance

### 1. Fitness Functions
```typescript
// test/fitness-function/database-performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { prisma } from '@/infra/database'
import { createUser } from '@/test/factory'

describe('Database Performance Tests', () => {
  it('should find user by email in less than 50ms', async () => {
    await createUser({ email: 'performance@test.com' })

    const start = performance.now()
    await prisma.user.findUnique({
      where: { email: 'performance@test.com' }
    })
    const end = performance.now()

    const duration = end - start
    expect(duration).toBeLessThan(50) // 50ms
  })

  it('should handle 100 concurrent user creations', async () => {
    const start = performance.now()

    const promises = Array.from({ length: 100 }, (_, i) =>
      createUser({
        email: `concurrent-${i}@test.com`,
        name: `User ${i}`
      })
    )

    await Promise.all(promises)
    const end = performance.now()

    const duration = end - start
    expect(duration).toBeLessThan(5000) // 5 segundos
  })
})
```

## Configuração de Coverage

### 1. Configuração no vite.config.ts
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        'src/main.ts',
        'src/@types/**'
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    }
  }
})
```

### 2. Scripts do package.json
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:domain": "vitest run --config vite.config.app-domain.ts",
    "test:business": "vitest run --config vite.config.business-flow.ts",
    "test:fitness": "vitest run --config vite.config.fitness.ts"
  }
}
```

## Comandos Úteis

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com UI
npm run test:ui

# Executar testes com coverage
npm run test:coverage

# Executar apenas testes de domínio
npm run test:domain

# Executar apenas testes de fluxo de negócio
npm run test:business

# Executar testes específicos
npx vitest user.test.ts

# Executar testes com filtro
npx vitest --grep "should create user"
```

## Links de Referência

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Vitest Configuration](https://vitest.dev/config/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
