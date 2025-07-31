# Inversify

## Visão Geral

Inversify é um container de injeção de dependências para TypeScript e JavaScript que suporta os princípios SOLID. No projeto, é usado para gerenciar todas as dependências da aplicação, seguindo os padrões de Clean Architecture.

## Configuração no Projeto

### Versão e Dependências
- **inversify**: 6.0.3
- **reflect-metadata**: 0.2.2 (necessário para decorators)

### Setup Principal
```typescript
// src/infra/ioc/container.ts
import 'reflect-metadata'
import { Container } from 'inversify'
import { TYPES } from './types'

// Configuração do container
export const container = new Container({
  defaultScope: 'Singleton',
  autoBindInjectable: true,
  skipBaseClassChecks: true
})

// Tipos de injeção
export const TYPES = {
  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  GymRepository: Symbol.for('GymRepository'),
  CheckInRepository: Symbol.for('CheckInRepository'),
  SubscriptionRepository: Symbol.for('SubscriptionRepository'),
  
  // Services
  UserService: Symbol.for('UserService'),
  GymService: Symbol.for('GymService'),
  CheckInService: Symbol.for('CheckInService'),
  AuthService: Symbol.for('AuthService'),
  SubscriptionService: Symbol.for('SubscriptionService'),
  
  // Infrastructure
  PrismaService: Symbol.for('PrismaService'),
  LoggerService: Symbol.for('LoggerService'),
  EmailService: Symbol.for('EmailService'),
  PaymentService: Symbol.for('PaymentService'),
  QueueService: Symbol.for('QueueService'),
  CacheService: Symbol.for('CacheService'),
  
  // External APIs
  StripeService: Symbol.for('StripeService'),
  
  // Utils
  HashProvider: Symbol.for('HashProvider'),
  TokenProvider: Symbol.for('TokenProvider'),
  DateProvider: Symbol.for('DateProvider')
}
```

## Configuração dos Módulos

### 1. Módulo de Usuário
```typescript
// src/bootstrap/setup-user-module.ts
import { ContainerModule } from 'inversify'
import { TYPES } from '@/infra/ioc/types'

// Domain
import { UserRepository } from '@/domain/user/repositories'

// Application
import { CreateUserService } from '@/application/user/create-user-service'
import { AuthenticateUserService } from '@/application/user/authenticate-user-service'
import { GetUserProfileService } from '@/application/user/get-user-profile-service'
import { UpdateUserService } from '@/application/user/update-user-service'

// Infrastructure
import { PrismaUserRepository } from '@/infra/database/repositories/prisma-user-repository'
import { BcryptHashProvider } from '@/infra/auth/bcrypt-hash-provider'
import { JwtTokenProvider } from '@/infra/auth/jwt-token-provider'

export const userModule = new ContainerModule((bind) => {
  // Repositories
  bind<UserRepository>(TYPES.UserRepository)
    .to(PrismaUserRepository)
    .inSingletonScope()

  // Services
  bind<CreateUserService>(TYPES.CreateUserService)
    .to(CreateUserService)
    .inTransientScope()

  bind<AuthenticateUserService>(TYPES.AuthenticateUserService)
    .to(AuthenticateUserService)
    .inTransientScope()

  bind<GetUserProfileService>(TYPES.GetUserProfileService)
    .to(GetUserProfileService)
    .inTransientScope()

  bind<UpdateUserService>(TYPES.UpdateUserService)
    .to(UpdateUserService)
    .inTransientScope()

  // Providers
  bind<BcryptHashProvider>(TYPES.HashProvider)
    .to(BcryptHashProvider)
    .inSingletonScope()

  bind<JwtTokenProvider>(TYPES.TokenProvider)
    .to(JwtTokenProvider)
    .inSingletonScope()
})
```

### 2. Módulo de Academia
```typescript
// src/bootstrap/setup-gym-module.ts
import { ContainerModule } from 'inversify'
import { TYPES } from '@/infra/ioc/types'

// Domain
import { GymRepository } from '@/domain/gym/repositories'

// Application
import { CreateGymService } from '@/application/gym/create-gym-service'
import { SearchGymsService } from '@/application/gym/search-gyms-service'
import { FetchNearbyGymsService } from '@/application/gym/fetch-nearby-gyms-service'

// Infrastructure
import { PrismaGymRepository } from '@/infra/database/repositories/prisma-gym-repository'

export const gymModule = new ContainerModule((bind) => {
  // Repository
  bind<GymRepository>(TYPES.GymRepository)
    .to(PrismaGymRepository)
    .inSingletonScope()

  // Services
  bind<CreateGymService>(TYPES.CreateGymService)
    .to(CreateGymService)
    .inTransientScope()

  bind<SearchGymsService>(TYPES.SearchGymsService)
    .to(SearchGymsService)
    .inTransientScope()

  bind<FetchNearbyGymsService>(TYPES.FetchNearbyGymsService)
    .to(FetchNearbyGymsService)
    .inTransientScope()
})
```

### 3. Módulo de Check-in
```typescript
// src/bootstrap/setup-check-in-module.ts
import { ContainerModule } from 'inversify'
import { TYPES } from '@/infra/ioc/types'

// Domain
import { CheckInRepository } from '@/domain/check-in/repositories'

// Application
import { CheckInService } from '@/application/check-in/check-in-service'
import { ValidateCheckInService } from '@/application/check-in/validate-check-in-service'
import { FetchUserCheckInsHistoryService } from '@/application/check-in/fetch-user-check-ins-history-service'
import { GetUserMetricsService } from '@/application/check-in/get-user-metrics-service'

// Infrastructure
import { PrismaCheckInRepository } from '@/infra/database/repositories/prisma-check-in-repository'

export const checkInModule = new ContainerModule((bind) => {
  // Repository
  bind<CheckInRepository>(TYPES.CheckInRepository)
    .to(PrismaCheckInRepository)
    .inSingletonScope()

  // Services
  bind<CheckInService>(TYPES.CheckInService)
    .to(CheckInService)
    .inTransientScope()

  bind<ValidateCheckInService>(TYPES.ValidateCheckInService)
    .to(ValidateCheckInService)
    .inTransientScope()

  bind<FetchUserCheckInsHistoryService>(TYPES.FetchUserCheckInsHistoryService)
    .to(FetchUserCheckInsHistoryService)
    .inTransientScope()

  bind<GetUserMetricsService>(TYPES.GetUserMetricsService)
    .to(GetUserMetricsService)
    .inTransientScope()
})
```

## Implementação de Services

### 1. Service com Injeção de Dependências
```typescript
// src/application/user/create-user-service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { UserRepository } from '@/domain/user/repositories'
import { HashProvider } from '@/domain/shared/providers'
import { User } from '@/domain/user/entities'
import { CreateUserDTO } from './dtos'
import { UserAlreadyExistsError } from './errors'

@injectable()
export class CreateUserService {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: UserRepository,
    
    @inject(TYPES.HashProvider)
    private hashProvider: HashProvider
  ) {}

  async execute(data: CreateUserDTO): Promise<User> {
    // Verificar se usuário já existe
    const userWithSameEmail = await this.userRepository.findByEmail(data.email)
    
    if (userWithSameEmail) {
      throw new UserAlreadyExistsError()
    }

    // Hash da senha
    const passwordHash = await this.hashProvider.hash(data.password)

    // Criar usuário
    const user = await this.userRepository.create({
      name: data.name,
      email: data.email,
      password: passwordHash
    })

    return user
  }
}
```

### 2. Service com Múltiplas Dependências
```typescript
// src/application/check-in/check-in-service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { CheckInRepository } from '@/domain/check-in/repositories'
import { GymRepository } from '@/domain/gym/repositories'
import { CheckIn } from '@/domain/check-in/entities'
import { CreateCheckInDTO } from './dtos'
import { 
  UserAlreadyCheckedInTodayError,
  GymNotFoundError,
  MaxDistanceError 
} from './errors'

@injectable()
export class CheckInService {
  constructor(
    @inject(TYPES.CheckInRepository)
    private checkInRepository: CheckInRepository,
    
    @inject(TYPES.GymRepository)
    private gymRepository: GymRepository
  ) {}

  async execute(
    userId: string, 
    gymId: string, 
    data: CreateCheckInDTO
  ): Promise<CheckIn> {
    // Verificar se já fez check-in hoje
    const checkInOnSameDate = await this.checkInRepository.findByUserIdOnDate(
      userId,
      new Date()
    )

    if (checkInOnSameDate) {
      throw new UserAlreadyCheckedInTodayError()
    }

    // Buscar academia
    const gym = await this.gymRepository.findById(gymId)
    
    if (!gym) {
      throw new GymNotFoundError()
    }

    // Calcular distância
    const distance = this.calculateDistance(
      { latitude: data.latitude, longitude: data.longitude },
      { latitude: gym.latitude.toNumber(), longitude: gym.longitude.toNumber() }
    )

    const MAX_DISTANCE_IN_KILOMETERS = 0.1 // 100 metros

    if (distance > MAX_DISTANCE_IN_KILOMETERS) {
      throw new MaxDistanceError()
    }

    // Criar check-in
    const checkIn = await this.checkInRepository.create({
      user_id: userId,
      gym_id: gymId,
      latitude: data.latitude,
      longitude: data.longitude
    })

    return checkIn
  }

  private calculateDistance(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number {
    // Implementação do cálculo de distância usando fórmula de Haversine
    const R = 6371 // Raio da Terra em km
    const dLat = this.toRadians(to.latitude - from.latitude)
    const dLon = this.toRadians(to.longitude - from.longitude)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) * Math.cos(this.toRadians(to.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}
```

## Implementação de Repositories

### 1. Repository com Prisma
```typescript
// src/infra/database/repositories/prisma-user-repository.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { PrismaService } from '@/infra/database/prisma-service'
import { UserRepository } from '@/domain/user/repositories'
import { User, CreateUserDTO } from '@/domain/user/entities'

@injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    @inject(TYPES.PrismaService)
    private prisma: PrismaService
  ) {}

  async create(data: CreateUserDTO): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        status: 'pending'
      }
    })

    return user
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id }
    })

    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    })

    return user
  }

  async findMany(params: {
    skip?: number
    take?: number
    search?: string
  }): Promise<User[]> {
    const users = await this.prisma.user.findMany({
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

    return users
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date()
      }
    })

    return user
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    })
  }
}
```

## Providers de Infraestrutura

### 1. Hash Provider
```typescript
// src/infra/auth/bcrypt-hash-provider.ts
import { injectable } from 'inversify'
import { hash, compare } from 'bcryptjs'
import { HashProvider } from '@/domain/shared/providers'

@injectable()
export class BcryptHashProvider implements HashProvider {
  async hash(payload: string): Promise<string> {
    return hash(payload, 6)
  }

  async compare(payload: string, hashed: string): Promise<boolean> {
    return compare(payload, hashed)
  }
}
```

### 2. Token Provider
```typescript
// src/infra/auth/jwt-token-provider.ts
import { injectable } from 'inversify'
import { sign, verify } from 'jsonwebtoken'
import { TokenProvider, TokenPayload } from '@/domain/shared/providers'
import { env } from '@/infra/env'

@injectable()
export class JwtTokenProvider implements TokenProvider {
  generateAccessToken(payload: TokenPayload): string {
    return sign(payload, env.JWT_SECRET, {
      subject: payload.sub,
      expiresIn: '10m'
    })
  }

  generateRefreshToken(payload: TokenPayload): string {
    return sign(payload, env.JWT_SECRET, {
      subject: payload.sub,
      expiresIn: '7d'
    })
  }

  verify(token: string): TokenPayload {
    try {
      const decoded = verify(token, env.JWT_SECRET) as TokenPayload
      return decoded
    } catch (error) {
      throw new Error('Invalid token')
    }
  }
}
```

### 3. Email Provider
```typescript
// src/infra/gateway/nodemailer-email-provider.ts
import { injectable } from 'inversify'
import nodemailer from 'nodemailer'
import { EmailProvider, SendEmailDTO } from '@/domain/shared/providers'
import { env } from '@/infra/env'

@injectable()
export class NodemailerEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    })
  }

  async send(data: SendEmailDTO): Promise<void> {
    await this.transporter.sendMail({
      from: data.from,
      to: data.to,
      subject: data.subject,
      html: data.body
    })
  }
}
```

## Configuração de Controllers

### 1. Controller com Container
```typescript
// src/infra/controller/user-controller.ts
import { FastifyInstance } from 'fastify'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { CreateUserService } from '@/application/user/create-user-service'
import { AuthenticateUserService } from '@/application/user/authenticate-user-service'
import { validate } from './middlewares/validation-middleware'
import { createUserSchema, loginSchema } from '@/application/user/dtos'

export async function userRoutes(app: FastifyInstance) {
  // Criar usuário
  app.post('/', {
    preHandler: [validate({ body: createUserSchema })]
  }, async (request, reply) => {
    const createUserService = container.get<CreateUserService>(TYPES.CreateUserService)
    
    const user = await createUserService.execute(request.body)
    
    return reply.status(201).send({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      created_at: user.created_at
    })
  })

  // Autenticar usuário
  app.post('/sessions', {
    preHandler: [validate({ body: loginSchema })]
  }, async (request, reply) => {
    const authenticateUserService = container.get<AuthenticateUserService>(TYPES.AuthenticateUserService)
    
    const { accessToken, refreshToken } = await authenticateUserService.execute(request.body)
    
    return reply
      .setCookie('refreshToken', refreshToken, {
        path: '/',
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7 // 7 dias
      })
      .status(200)
      .send({ accessToken })
  })

  // Perfil do usuário (rota protegida)
  app.get('/me', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const getUserProfileService = container.get<GetUserProfileService>(TYPES.GetUserProfileService)
    
    const user = await getUserProfileService.execute({
      userId: request.user.sub
    })
    
    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        created_at: user.created_at
      }
    })
  })
}
```

## Plugin Fastify para Container

### 1. Plugin de Integração
```typescript
// src/infra/server/container-plugin.ts
import { FastifyPluginAsync } from 'fastify'
import { container } from '@/infra/ioc/container'

export const containerPlugin: FastifyPluginAsync = async (fastify) => {
  // Registrar container no contexto do Fastify
  fastify.decorate('container', container)
  
  // Hook para cleanup de recursos
  fastify.addHook('onClose', async () => {
    // Cleanup de recursos do container se necessário
    container.unbindAll()
  })
}

// Declaração de tipos para TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    container: Container
  }
}
```

## Testes com Inversify

### 1. Setup de Teste
```typescript
// test/setup-container.ts
import 'reflect-metadata'
import { Container } from 'inversify'
import { TYPES } from '@/infra/ioc/types'

// Repositories em memória para teste
import { InMemoryUserRepository } from './repositories/in-memory-user-repository'
import { InMemoryGymRepository } from './repositories/in-memory-gym-repository'
import { InMemoryCheckInRepository } from './repositories/in-memory-check-in-repository'

// Providers mock
import { FakeHashProvider } from './providers/fake-hash-provider'
import { FakeTokenProvider } from './providers/fake-token-provider'

export function createTestContainer(): Container {
  const testContainer = new Container()

  // Repositories
  testContainer.bind(TYPES.UserRepository).to(InMemoryUserRepository)
  testContainer.bind(TYPES.GymRepository).to(InMemoryGymRepository)
  testContainer.bind(TYPES.CheckInRepository).to(InMemoryCheckInRepository)

  // Providers
  testContainer.bind(TYPES.HashProvider).to(FakeHashProvider)
  testContainer.bind(TYPES.TokenProvider).to(FakeTokenProvider)

  return testContainer
}
```

### 2. Teste de Service
```typescript
// src/application/user/create-user-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestContainer } from '@/test/setup-container'
import { TYPES } from '@/infra/ioc/types'
import { CreateUserService } from './create-user-service'
import { UserAlreadyExistsError } from './errors'

describe('Create User Service', () => {
  let container: Container
  let createUserService: CreateUserService

  beforeEach(() => {
    container = createTestContainer()
    createUserService = container.get<CreateUserService>(TYPES.CreateUserService)
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

## Bootstrap da Aplicação

### 1. Configuração Principal
```typescript
// src/bootstrap/container.ts
import 'reflect-metadata'
import { Container } from 'inversify'
import { TYPES } from '@/infra/ioc/types'

// Modules
import { userModule } from './setup-user-module'
import { gymModule } from './setup-gym-module'
import { checkInModule } from './setup-check-in-module'

// Infrastructure
import { PrismaService } from '@/infra/database/prisma-service'
import { WinstonLoggerService } from '@/infra/logger/winston-logger-service'
import { RedisQueueService } from '@/infra/queue/redis-queue-service'
import { RedisCacheService } from '@/infra/cache/redis-cache-service'

// Create container
export const container = new Container({
  defaultScope: 'Singleton',
  autoBindInjectable: true,
  skipBaseClassChecks: true
})

// Load modules
container.load(
  userModule,
  gymModule,
  checkInModule
)

// Infrastructure services
container.bind<PrismaService>(TYPES.PrismaService).to(PrismaService).inSingletonScope()
container.bind<WinstonLoggerService>(TYPES.LoggerService).to(WinstonLoggerService).inSingletonScope()
container.bind<RedisQueueService>(TYPES.QueueService).to(RedisQueueService).inSingletonScope()
container.bind<RedisCacheService>(TYPES.CacheService).to(RedisCacheService).inSingletonScope()
```

### 2. Servidor Principal
```typescript
// src/main.ts
import 'reflect-metadata'
import { buildServer } from '@/bootstrap/server-build'
import { container } from '@/bootstrap/container'
import { env } from '@/infra/env'

async function main() {
  try {
    // Construir servidor
    const app = await buildServer()
    
    // Registrar plugin do container
    await app.register(containerPlugin)
    
    // Inicializar serviços
    const prismaService = container.get<PrismaService>(TYPES.PrismaService)
    await prismaService.onModuleInit()
    
    // Iniciar servidor
    await app.listen({
      host: env.HOST,
      port: env.PORT
    })
    
    console.log(`🚀 HTTP Server running on http://${env.HOST}:${env.PORT}`)
  } catch (error) {
    console.error('❌ Error starting server:', error)
    process.exit(1)
  }
}

main()
```

## Links de Referência

- [Inversify Documentation](https://inversify.io/)
- [Inversify GitHub](https://github.com/inversify/InversifyJS)
- [Dependency Injection Principles](https://en.wikipedia.org/wiki/Dependency_injection)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
