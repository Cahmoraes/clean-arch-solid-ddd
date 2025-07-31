# BCryptjs

## Visão Geral

BCryptjs é uma implementação otimizada do algoritmo bcrypt em JavaScript puro, sem dependências nativas. É usado no projeto para hash seguro de senhas com salt e verificação de credenciais.

## Configuração no Projeto

### Versão
- **bcryptjs**: 2.4.3

### Instalação
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

## Implementação no Projeto

### 1. Hash Provider Service
```typescript
// src/infra/crypto/bcrypt-hash-provider.ts
import bcrypt from 'bcryptjs'
import { injectable } from 'inversify'

export interface HashProvider {
  hash(payload: string): Promise<string>
  compare(payload: string, hash: string): Promise<boolean>
}

@injectable()
export class BcryptHashProvider implements HashProvider {
  private readonly saltRounds = 12

  async hash(payload: string): Promise<string> {
    return bcrypt.hash(payload, this.saltRounds)
  }

  async compare(payload: string, hash: string): Promise<boolean> {
    return bcrypt.compare(payload, hash)
  }
}
```

### 2. Binding no Container IoC
```typescript
// src/bootstrap/container.ts
import { Container } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { HashProvider } from '@/infra/crypto/hash-provider'
import { BcryptHashProvider } from '@/infra/crypto/bcrypt-hash-provider'

const container = new Container()

container.bind<HashProvider>(TYPES.HashProvider)
  .to(BcryptHashProvider)
  .inSingletonScope()

export { container }
```

### 3. Types Definition
```typescript
// src/infra/ioc/types.ts
export const TYPES = {
  // ... outros types
  HashProvider: Symbol.for('HashProvider')
}
```

## Uso em Services

### 1. Create User Service
```typescript
// src/application/user/create-user-service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { HashProvider } from '@/infra/crypto/hash-provider'
import { UserRepository } from '@/domain/user/user-repository'
import { User } from '@/domain/user/user'

interface CreateUserDTO {
  name: string
  email: string
  password: string
}

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
    const existingUser = await this.userRepository.findByEmail(data.email)
    
    if (existingUser) {
      throw new UserAlreadyExistsError()
    }

    // Hash da senha
    const hashedPassword = await this.hashProvider.hash(data.password)

    // Criar usuário
    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword
    })

    return user
  }
}
```

### 2. Authenticate User Service
```typescript
// src/application/user/authenticate-user-service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { HashProvider } from '@/infra/crypto/hash-provider'
import { UserRepository } from '@/domain/user/user-repository'
import { JwtProvider } from '@/infra/auth/jwt-provider'

interface AuthenticateUserDTO {
  email: string
  password: string
}

interface AuthenticateUserResponse {
  user: User
  token: string
}

@injectable()
export class AuthenticateUserService {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: UserRepository,
    
    @inject(TYPES.HashProvider)
    private hashProvider: HashProvider,
    
    @inject(TYPES.JwtProvider)
    private jwtProvider: JwtProvider
  ) {}

  async execute(data: AuthenticateUserDTO): Promise<AuthenticateUserResponse> {
    // Buscar usuário por email
    const user = await this.userRepository.findByEmail(data.email)
    
    if (!user) {
      throw new InvalidCredentialsError()
    }

    // Verificar senha
    const isPasswordValid = await this.hashProvider.compare(
      data.password,
      user.password
    )

    if (!isPasswordValid) {
      throw new InvalidCredentialsError()
    }

    // Gerar token
    const token = await this.jwtProvider.sign({
      sub: user.id,
      email: user.email
    })

    return {
      user,
      token
    }
  }
}
```

### 3. Change Password Service
```typescript
// src/application/user/change-password-service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { HashProvider } from '@/infra/crypto/hash-provider'
import { UserRepository } from '@/domain/user/user-repository'

interface ChangePasswordDTO {
  userId: string
  currentPassword: string
  newPassword: string
}

@injectable()
export class ChangePasswordService {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: UserRepository,
    
    @inject(TYPES.HashProvider)
    private hashProvider: HashProvider
  ) {}

  async execute(data: ChangePasswordDTO): Promise<void> {
    // Buscar usuário
    const user = await this.userRepository.findById(data.userId)
    
    if (!user) {
      throw new UserNotFoundError()
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await this.hashProvider.compare(
      data.currentPassword,
      user.password
    )

    if (!isCurrentPasswordValid) {
      throw new InvalidCurrentPasswordError()
    }

    // Verificar se nova senha é diferente da atual
    const isSamePassword = await this.hashProvider.compare(
      data.newPassword,
      user.password
    )

    if (isSamePassword) {
      throw new SamePasswordError()
    }

    // Hash da nova senha
    const hashedNewPassword = await this.hashProvider.hash(data.newPassword)

    // Atualizar senha
    await this.userRepository.updatePassword(data.userId, hashedNewPassword)
  }
}
```

## Configuração de Rounds

### 1. Environment Configuration
```typescript
// src/infra/env/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // ... outras variáveis
  BCRYPT_ROUNDS: z.coerce.number().default(12)
})

export const env = envSchema.parse(process.env)
```

### 2. Configurable Hash Provider
```typescript
// src/infra/crypto/configurable-bcrypt-hash-provider.ts
import bcrypt from 'bcryptjs'
import { injectable } from 'inversify'
import { env } from '@/infra/env'

@injectable()
export class ConfigurableBcryptHashProvider implements HashProvider {
  private readonly saltRounds: number

  constructor() {
    this.saltRounds = env.BCRYPT_ROUNDS
  }

  async hash(payload: string): Promise<string> {
    // Validar força da senha antes do hash
    this.validatePasswordStrength(payload)
    
    return bcrypt.hash(payload, this.saltRounds)
  }

  async compare(payload: string, hash: string): Promise<boolean> {
    return bcrypt.compare(payload, hash)
  }

  private validatePasswordStrength(password: string): void {
    // Mínimo 8 caracteres
    if (password.length < 8) {
      throw new WeakPasswordError('Password must be at least 8 characters long')
    }

    // Pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(password)) {
      throw new WeakPasswordError('Password must contain at least one uppercase letter')
    }

    // Pelo menos uma letra minúscula
    if (!/[a-z]/.test(password)) {
      throw new WeakPasswordError('Password must contain at least one lowercase letter')
    }

    // Pelo menos um número
    if (!/\d/.test(password)) {
      throw new WeakPasswordError('Password must contain at least one number')
    }

    // Pelo menos um caractere especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new WeakPasswordError('Password must contain at least one special character')
    }
  }

  // Método para verificar força do hash
  getRounds(hash: string): number {
    return bcrypt.getRounds(hash)
  }

  // Método para verificar se hash precisa ser rehashed
  needsRehash(hash: string): boolean {
    const currentRounds = this.getRounds(hash)
    return currentRounds < this.saltRounds
  }
}
```

## Hash Migration Service

### 1. Password Rehash Service
```typescript
// src/application/user/rehash-password-service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { ConfigurableBcryptHashProvider } from '@/infra/crypto/configurable-bcrypt-hash-provider'
import { UserRepository } from '@/domain/user/user-repository'

@injectable()
export class RehashPasswordService {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: UserRepository,
    
    @inject(TYPES.HashProvider)
    private hashProvider: ConfigurableBcryptHashProvider
  ) {}

  async execute(userId: string, plainPassword: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId)
    
    if (!user) {
      throw new UserNotFoundError()
    }

    // Verificar se o hash atual precisa ser atualizado
    if (this.hashProvider.needsRehash(user.password)) {
      // Verificar se a senha está correta
      const isValid = await this.hashProvider.compare(plainPassword, user.password)
      
      if (isValid) {
        // Gerar novo hash com rounds atualizados
        const newHash = await this.hashProvider.hash(plainPassword)
        
        // Atualizar no banco
        await this.userRepository.updatePassword(userId, newHash)
        
        return true // Hash foi atualizado
      }
    }

    return false // Hash não precisava ser atualizado
  }
}
```

### 2. Middleware de Rehash Automático
```typescript
// src/infra/middleware/auto-rehash-middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { RehashPasswordService } from '@/application/user/rehash-password-service'

export async function autoRehashMiddleware(
  request: FastifyRequest<{
    Body: { email: string; password: string }
  }>,
  reply: FastifyReply
) {
  // Aplicar apenas em rotas de login
  if (request.url !== '/auth/login') {
    return
  }

  const rehashService = container.get<RehashPasswordService>(TYPES.RehashPasswordService)

  // Hook para executar após autenticação bem-sucedida
  reply.addHook('onSend', async (request, reply, payload) => {
    if (reply.statusCode === 200 && request.user) {
      try {
        await rehashService.execute(request.user.sub, request.body.password)
      } catch (error) {
        // Log do erro, mas não falhar a requisição
        console.error('Error rehashing password:', error)
      }
    }
    
    return payload
  })
}
```

## Testes

### 1. Hash Provider Tests
```typescript
// test/unit/infra/crypto/bcrypt-hash-provider.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { BcryptHashProvider } from '@/infra/crypto/bcrypt-hash-provider'

describe('BcryptHashProvider', () => {
  let hashProvider: BcryptHashProvider

  beforeEach(() => {
    hashProvider = new BcryptHashProvider()
  })

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'test-password-123'
      
      const hash = await hashProvider.hash(password)
      
      expect(hash).toEqual(expect.any(String))
      expect(hash).not.toBe(password)
      expect(hash).toMatch(/^\$2[aby]\$/) // bcrypt hash pattern
    })

    it('should generate different hashes for same password', async () => {
      const password = 'test-password-123'
      
      const hash1 = await hashProvider.hash(password)
      const hash2 = await hashProvider.hash(password)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should use correct salt rounds', async () => {
      const password = 'test-password-123'
      
      const hash = await hashProvider.hash(password)
      
      // Extrair rounds do hash
      const rounds = parseInt(hash.split('$')[2])
      expect(rounds).toBe(12)
    })
  })

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const password = 'test-password-123'
      const hash = await hashProvider.hash(password)
      
      const isValid = await hashProvider.compare(password, hash)
      
      expect(isValid).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const password = 'test-password-123'
      const wrongPassword = 'wrong-password'
      const hash = await hashProvider.hash(password)
      
      const isValid = await hashProvider.compare(wrongPassword, hash)
      
      expect(isValid).toBe(false)
    })

    it('should return false for empty password', async () => {
      const password = 'test-password-123'
      const hash = await hashProvider.hash(password)
      
      const isValid = await hashProvider.compare('', hash)
      
      expect(isValid).toBe(false)
    })

    it('should handle malformed hash gracefully', async () => {
      const password = 'test-password-123'
      const malformedHash = 'not-a-valid-hash'
      
      const isValid = await hashProvider.compare(password, malformedHash)
      
      expect(isValid).toBe(false)
    })
  })
})
```

### 2. Integration Tests
```typescript
// test/integration/auth/authenticate-user.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setupApp } from '@/test/setup-app'
import { setupUser } from '@/test/factory/user-factory'

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await setupApp()
  })

  it('should authenticate user with correct credentials', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Test123!@#'
    }

    // Criar usuário
    await setupUser(userData)

    // Tentar autenticar
    const response = await global.fastify.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: userData.email,
        password: userData.password
      }
    })

    expect(response.statusCode).toBe(200)
    
    const body = JSON.parse(response.body)
    expect(body).toHaveProperty('token')
    expect(body).toHaveProperty('user')
    expect(body.user.email).toBe(userData.email)
  })

  it('should reject authentication with wrong password', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Test123!@#'
    }

    // Criar usuário
    await setupUser(userData)

    // Tentar autenticar com senha errada
    const response = await global.fastify.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: userData.email,
        password: 'WrongPassword123!'
      }
    })

    expect(response.statusCode).toBe(401)
    
    const body = JSON.parse(response.body)
    expect(body.error).toBe('Invalid credentials')
  })

  it('should reject authentication with non-existent email', async () => {
    const response = await global.fastify.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'nonexistent@example.com',
        password: 'Test123!@#'
      }
    })

    expect(response.statusCode).toBe(401)
    
    const body = JSON.parse(response.body)
    expect(body.error).toBe('Invalid credentials')
  })
})
```

## Performance Considerations

### 1. Async vs Sync Operations
```typescript
// ❌ Evitar operações síncronas em produção
const hash = bcrypt.hashSync(password, 12) // Bloqueia o event loop

// ✅ Usar sempre operações assíncronas
const hash = await bcrypt.hash(password, 12) // Não bloqueia o event loop
```

### 2. Salt Rounds Configuration
```typescript
// Configuração recomendada por ambiente
const saltRounds = {
  development: 10,   // Mais rápido para testes
  test: 4,          // Muito rápido para testes unitários
  production: 12    // Seguro para produção (2024)
}
```

### 3. Benchmark de Performance
```typescript
// test/benchmark/bcrypt-performance.test.ts
import { describe, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { performance } from 'perf_hooks'

describe('BCrypt Performance Benchmark', () => {
  const password = 'test-password-123'
  const rounds = [10, 11, 12, 13, 14]

  rounds.forEach(round => {
    it(`should benchmark ${round} rounds`, async () => {
      const start = performance.now()
      
      await bcrypt.hash(password, round)
      
      const end = performance.now()
      const duration = end - start
      
      console.log(`${round} rounds: ${duration.toFixed(2)}ms`)
      
      // Expectativa: cada round adicional deve dobrar o tempo
      expect(duration).toBeLessThan(5000) // Máximo 5 segundos
    })
  })

  it('should benchmark compare operation', async () => {
    const hash = await bcrypt.hash(password, 12)
    
    const start = performance.now()
    
    await bcrypt.compare(password, hash)
    
    const end = performance.now()
    const duration = end - start
    
    console.log(`Compare operation: ${duration.toFixed(2)}ms`)
    
    expect(duration).toBeLessThan(1000) // Máximo 1 segundo
  })
})
```

## Segurança e Best Practices

### 1. Validação de Entrada
```typescript
// src/domain/user/password-validator.ts
export class PasswordValidator {
  static validate(password: string): void {
    if (!password || password.length < 8) {
      throw new InvalidPasswordError('Password must be at least 8 characters long')
    }

    if (password.length > 72) {
      // bcrypt tem limite de 72 bytes
      throw new InvalidPasswordError('Password must be at most 72 characters long')
    }

    // Verificar caracteres nulos (problemas com bcrypt)
    if (password.includes('\0')) {
      throw new InvalidPasswordError('Password cannot contain null characters')
    }

    // Verificar se não é apenas espaços
    if (password.trim().length === 0) {
      throw new InvalidPasswordError('Password cannot be only whitespace')
    }
  }
}
```

### 2. Rate Limiting para Autenticação
```typescript
// src/infra/middleware/auth-rate-limit.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { RateLimiterMemory } from 'rate-limiter-flexible'

const authRateLimiter = new RateLimiterMemory({
  keyGenerator: (req: FastifyRequest) => req.ip,
  points: 5, // 5 tentativas
  duration: 900, // por 15 minutos
  blockDuration: 900 // bloquear por 15 minutos
})

export async function authRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await authRateLimiter.consume(request.ip)
  } catch (rejRes) {
    const remainingTime = Math.round(rejRes.msBeforeNext / 1000)
    
    reply.status(429).send({
      error: 'Too Many Requests',
      message: `Too many authentication attempts. Try again in ${remainingTime} seconds.`,
      retryAfter: remainingTime
    })
  }
}
```

### 3. Environment Variables
```env
# .env
BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_POINTS=5
AUTH_RATE_LIMIT_DURATION=900
AUTH_RATE_LIMIT_BLOCK_DURATION=900
```

## Links de Referência

- [BCryptjs Documentation](https://github.com/dcodeio/bcrypt.js)
- [BCrypt Cost Factor Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Password Storage](https://owasp.org/www-project-cheat-sheets/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Node.js Crypto Best Practices](https://nodejs.org/en/knowledge/cryptography/how-to-use-crypto-module/)
