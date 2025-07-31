# Zod

## Visão Geral

Zod é uma biblioteca de validação de schema TypeScript-first com inferência de tipos estática. No projeto, é usado para validação de dados de entrada, DTOs e configuração de variáveis de ambiente.

## Configuração no Projeto

### Versão
- **zod**: 3.24.1

### Integração Principal
```typescript
// src/infra/env/index.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  
  // Database
  DATABASE_URL: z.string().url(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  
  // Auth
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  
  // External APIs
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
```

## Validação de DTOs

### 1. User DTOs
```typescript
// src/application/user/dtos.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must have at least 2 characters')
    .max(100, 'Name must have at most 100 characters'),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),
  password: z.string()
    .min(6, 'Password must have at least 6 characters')
    .max(100, 'Password must have at most 100 characters')
})

export const updateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must have at least 2 characters')
    .max(100, 'Name must have at most 100 characters')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .optional()
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required')
})

// Tipos inferidos automaticamente
export type CreateUserDTO = z.infer<typeof createUserSchema>
export type UpdateUserDTO = z.infer<typeof updateUserSchema>
export type LoginDTO = z.infer<typeof loginSchema>
```

### 2. Gym DTOs
```typescript
// src/application/gym/dtos.ts
import { z } from 'zod'

export const createGymSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must have at most 200 characters'),
  description: z.string()
    .max(500, 'Description must have at most 500 characters')
    .optional(),
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Invalid phone format. Use (XX) XXXXX-XXXX')
    .optional(),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'Invalid CNPJ format')
    .transform(cnpj => cnpj.replace(/[^\d]/g, '')) // Remove formatting
})

export const searchGymsSchema = z.object({
  query: z.string().optional(),
  latitude: z.coerce.number()
    .min(-90).max(90)
    .optional(),
  longitude: z.coerce.number()
    .min(-180).max(180)
    .optional(),
  maxDistance: z.coerce.number()
    .positive()
    .max(50) // máximo 50km
    .default(10), // padrão 10km
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20)
})

export type CreateGymDTO = z.infer<typeof createGymSchema>
export type SearchGymsDTO = z.infer<typeof searchGymsSchema>
```

### 3. Check-in DTOs
```typescript
// src/application/check-in/dtos.ts
import { z } from 'zod'

export const createCheckInSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
})

export const validateCheckInSchema = z.object({
  checkInId: z.string().cuid('Invalid check-in ID format')
})

export const getCheckInHistorySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  startDate: z.string()
    .datetime()
    .optional()
    .transform(date => date ? new Date(date) : undefined),
  endDate: z.string()
    .datetime()
    .optional()
    .transform(date => date ? new Date(date) : undefined)
})

export type CreateCheckInDTO = z.infer<typeof createCheckInSchema>
export type ValidateCheckInDTO = z.infer<typeof validateCheckInSchema>
export type GetCheckInHistoryDTO = z.infer<typeof getCheckInHistorySchema>
```

## Validação com Enums

### 1. Status Enums
```typescript
// src/domain/shared/enums.ts
import { z } from 'zod'

export const userStatusEnum = z.enum(['pending', 'active', 'inactive'])
export const subscriptionTypeEnum = z.enum(['basic', 'premium', 'enterprise'])
export const subscriptionStatusEnum = z.enum(['active', 'inactive', 'cancelled', 'expired'])

export type UserStatus = z.infer<typeof userStatusEnum>
export type SubscriptionType = z.infer<typeof subscriptionTypeEnum>
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>

// Uso em schemas
export const updateUserStatusSchema = z.object({
  userId: z.string().cuid(),
  status: userStatusEnum
})
```

### 2. Native Enums
```typescript
// Para enums TypeScript nativos
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
  BOLETO = 'boleto'
}

export const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  description: z.string().optional()
})
```

## Validação Avançada

### 1. Refinements Customizados
```typescript
// src/shared/validations/custom-validations.ts
import { z } from 'zod'

// Validação de CNPJ
export const cnpjSchema = z.string()
  .regex(/^\d{14}$/, 'CNPJ must have exactly 14 digits')
  .refine((cnpj) => {
    // Implementação do algoritmo de validação de CNPJ
    if (cnpj.length !== 14) return false
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false
    
    // Calcular dígitos verificadores
    let sum = 0
    let weight = 2
    
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(cnpj[i]) * weight
      weight = weight === 9 ? 2 : weight + 1
    }
    
    const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (parseInt(cnpj[12]) !== firstDigit) return false
    
    sum = 0
    weight = 2
    
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(cnpj[i]) * weight
      weight = weight === 9 ? 2 : weight + 1
    }
    
    const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return parseInt(cnpj[13]) === secondDigit
  }, 'Invalid CNPJ')

// Validação de coordenadas
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
}).refine((coords) => {
  // Verificar se as coordenadas não são o ponto nulo (0, 0)
  return !(coords.latitude === 0 && coords.longitude === 0)
}, {
  message: 'Invalid coordinates: cannot be null island (0, 0)'
})

// Validação de senha forte
export const strongPasswordSchema = z.string()
  .min(8, 'Password must have at least 8 characters')
  .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/^(?=.*\d)/, 'Password must contain at least one number')
  .regex(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character')
```

### 2. Validação Condicional
```typescript
// src/application/subscription/dtos.ts
import { z } from 'zod'

export const createSubscriptionSchema = z.object({
  userId: z.string().cuid(),
  type: subscriptionTypeEnum,
  paymentMethod: z.nativeEnum(PaymentMethod),
  // Campos condicionais baseados no método de pagamento
  cardToken: z.string().optional(),
  pixKey: z.string().optional(),
  boletoData: z.object({
    dueDate: z.string().datetime(),
    instructions: z.string().optional()
  }).optional()
}).refine((data) => {
  // Validar campos obrigatórios baseados no método de pagamento
  if (data.paymentMethod === PaymentMethod.CREDIT_CARD || 
      data.paymentMethod === PaymentMethod.DEBIT_CARD) {
    return !!data.cardToken
  }
  
  if (data.paymentMethod === PaymentMethod.PIX) {
    return !!data.pixKey
  }
  
  if (data.paymentMethod === PaymentMethod.BOLETO) {
    return !!data.boletoData
  }
  
  return true
}, {
  message: 'Required payment data missing for selected payment method'
})
```

## Preprocessamento de Dados

### 1. Transformações
```typescript
// src/shared/validations/transformations.ts
import { z } from 'zod'

// Normalizar email
export const emailSchema = z.string()
  .email()
  .toLowerCase()
  .transform(email => email.trim())

// Formatar telefone
export const phoneSchema = z.string()
  .regex(/^\(?[0-9]{2}\)?\s?[0-9]{4,5}-?[0-9]{4}$/)
  .transform(phone => {
    // Remove formatação e adiciona formatação padrão
    const digits = phone.replace(/\D/g, '')
    return `(${digits.slice(0, 2)}) ${digits.slice(2, -4)}-${digits.slice(-4)}`
  })

// Converter string para número
export const priceSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      return Number(val.replace(/[^0-9.]/g, ''))
    }
    return val
  },
  z.number().positive()
)

// Data ISO para Date object
export const dateSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      return new Date(val)
    }
    return val
  },
  z.date()
)
```

### 2. Sanitização
```typescript
// src/shared/validations/sanitization.ts
import { z } from 'zod'

// Remover tags HTML
export const htmlSafeString = z.string()
  .transform(str => str.replace(/<[^>]*>/g, ''))
  .transform(str => str.trim())

// Normalizar texto
export const normalizedTextSchema = z.string()
  .transform(str => str.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  .transform(str => str.toLowerCase())
  .transform(str => str.trim())
```

## Validação em Controllers

### 1. Middleware de Validação
```typescript
// src/infra/controller/middlewares/validation-middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { ZodSchema, ZodError } from 'zod'

export function validate(schemas: {
  body?: ZodSchema
  params?: ZodSchema
  query?: ZodSchema
}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (schemas.body) {
        request.body = schemas.body.parse(request.body)
      }
      
      if (schemas.params) {
        request.params = schemas.params.parse(request.params)
      }
      
      if (schemas.query) {
        request.query = schemas.query.parse(request.query)
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          message: 'Validation error',
          errors: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        })
      }
      throw error
    }
  }
}
```

### 2. Uso em Rotas
```typescript
// src/infra/controller/user-controller.ts
import { FastifyInstance } from 'fastify'
import { validate } from './middlewares/validation-middleware'
import { createUserSchema, updateUserSchema } from '@/application/user/dtos'

export async function userRoutes(app: FastifyInstance) {
  // Criar usuário
  app.post('/', {
    preHandler: [validate({ body: createUserSchema })]
  }, async (request, reply) => {
    const userData = request.body as CreateUserDTO
    // userData é tipado e validado
    const user = await userService.create(userData)
    return reply.status(201).send(user)
  })

  // Atualizar usuário
  app.put('/:id', {
    preHandler: [
      validate({
        params: z.object({ id: z.string().cuid() }),
        body: updateUserSchema
      })
    ]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userData = request.body as UpdateUserDTO
    
    const user = await userService.update(id, userData)
    return reply.send(user)
  })
}
```

## Error Handling

### 1. Formatação de Erros
```typescript
// src/infra/error/zod-error-formatter.ts
import { ZodError, ZodIssue } from 'zod'

export interface FormattedError {
  field: string
  message: string
  code: string
  value?: any
}

export function formatZodError(error: ZodError): FormattedError[] {
  return error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
    value: 'received' in issue ? issue.received : undefined
  }))
}

// Uso no error handler global
app.setErrorHandler(async (error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      errors: formatZodError(error),
      timestamp: new Date().toISOString()
    })
  }
  
  // outros handlers...
})
```

### 2. Mensagens Customizadas
```typescript
// src/shared/validations/messages.ts
export const validationMessages = {
  required: 'This field is required',
  invalid_email: 'Please provide a valid email address',
  invalid_string: 'This field must be a text',
  invalid_number: 'This field must be a number',
  too_small: 'This field is too short',
  too_big: 'This field is too long'
}

// Schema com mensagens customizadas
export const userSchema = z.object({
  name: z.string({
    required_error: validationMessages.required,
    invalid_type_error: validationMessages.invalid_string
  }).min(2, 'Name must have at least 2 characters'),
  
  email: z.string({
    required_error: validationMessages.required
  }).email(validationMessages.invalid_email),
  
  age: z.number({
    required_error: validationMessages.required,
    invalid_type_error: validationMessages.invalid_number
  }).min(18, 'You must be at least 18 years old')
})
```

## Testes com Zod

### 1. Testes de Validação
```typescript
// src/shared/validations/user-validation.test.ts
import { describe, it, expect } from 'vitest'
import { createUserSchema, updateUserSchema } from '@/application/user/dtos'

describe('User Validation', () => {
  describe('createUserSchema', () => {
    it('should validate valid user data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123456'
      }

      const result = createUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: '123456'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_string')
      }
    })

    it('should reject short password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123'
      }

      const result = createUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('too_small')
      }
    })
  })
})
```

### 2. Mock de Validação
```typescript
// test/mocks/validation-mocks.ts
import { vi } from 'vitest'
import { z } from 'zod'

export const mockValidationSuccess = <T>(data: T) => {
  return vi.fn().mockReturnValue({
    success: true,
    data
  })
}

export const mockValidationError = (issues: any[]) => {
  return vi.fn().mockReturnValue({
    success: false,
    error: {
      issues
    }
  })
}

// Uso em testes
const mockSchema = {
  safeParse: mockValidationSuccess({ name: 'John', email: 'john@test.com' })
}
```

## Utilitários

### 1. Schema Helpers
```typescript
// src/shared/validations/helpers.ts
import { z } from 'zod'

// ID genérico
export const idSchema = z.string().cuid('Invalid ID format')

// Paginação
export const paginationSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20)
})

// Ordenação
export const sortSchema = z.object({
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Filtro de data
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate)
  }
  return true
}, {
  message: 'Start date must be before end date'
})

// Combinar schemas
export const listQuerySchema = paginationSchema
  .merge(sortSchema)
  .merge(dateRangeSchema)
```

## Links de Referência

- [Zod Documentation](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)
- [Zod Error Handling](https://zod.dev/ERROR_HANDLING)
- [Zod Refinements](https://zod.dev/REFINEMENT)
