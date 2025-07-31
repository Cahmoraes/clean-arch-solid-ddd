# Fastify

## Visão Geral

Fastify é um framework web rápido e eficiente para Node.js, focado em alta performance e baixo overhead. No projeto, é usado como servidor HTTP principal com suporte completo ao TypeScript e sistema de plugins.

## Configuração no Projeto

### Versão e Plugins
- **Fastify Core**: 5.4.0
- **@fastify/cookie**: 10.2.0 (gerenciamento de cookies)
- **@fastify/cors**: 10.1.0 (Cross-Origin Resource Sharing)
- **@fastify/jwt**: 9.1.0 (JSON Web Tokens)

### Setup Principal
```typescript
// src/bootstrap/server-build.ts
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    bodyLimit: 1048576, // 1MB
  })

  // Registro de plugins
  await app.register(fastifyCors, {
    origin: true,
    credentials: true
  })

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'refreshToken',
      signed: false
    }
  })

  await app.register(fastifyCookie)

  return app
}
```

## Configuração de Plugins

### 1. CORS (Cross-Origin Resource Sharing)
```typescript
await app.register(fastifyCors, {
  origin: true,                    // Permite qualquer origem
  credentials: true,               // Permite cookies cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

### 2. JWT (JSON Web Tokens)
```typescript
await app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: 'refreshToken',   // Nome do cookie para refresh token
    signed: false                 // Cookie não assinado
  },
  sign: {
    expiresIn: '10m'             // Token expira em 10 minutos
  }
})
```

### 3. Cookie Management
```typescript
await app.register(fastifyCookie, {
  secret: env.COOKIE_SECRET,       // Chave para assinar cookies
  parseOptions: {
    httpOnly: true,                // Cookies apenas HTTP
    secure: env.NODE_ENV === 'production', // HTTPS em produção
    sameSite: 'strict'             // Proteção CSRF
  }
})
```

## Patterns de Uso

### 1. Definição de Rotas
```typescript
// Rota simples
app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Rota com parâmetros
app.get<{
  Params: { id: string }
}>('/users/:id', async (request, reply) => {
  const { id } = request.params
  // implementação
})

// Rota com body tipado
app.post<{
  Body: CreateUserDTO
}>('/users', async (request, reply) => {
  const userData = request.body
  // implementação
})
```

### 2. Hooks e Middlewares
```typescript
// Hook global - executa antes de todas as rotas
app.addHook('preHandler', async (request, reply) => {
  console.log(`${request.method} ${request.url}`)
})

// Hook de autenticação
app.addHook('preHandler', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// Hook específico para uma rota
app.get('/protected', {
  preHandler: [app.authenticate]
}, async (request, reply) => {
  return { user: request.user }
})
```

### 3. Validação com Schema
```typescript
const createUserSchema = {
  body: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', minLength: 2 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' }
      }
    }
  }
}

app.post('/users', { schema: createUserSchema }, async (request, reply) => {
  // request.body é tipado e validado automaticamente
})
```

## Integração com Container IoC

### 1. Plugin de Container
```typescript
// src/infra/server/container-plugin.ts
import { FastifyPluginAsync } from 'fastify'
import { container } from '@/bootstrap/container'

export const containerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('container', container)
}

declare module 'fastify' {
  interface FastifyInstance {
    container: Container
  }
}
```

### 2. Uso em Rotas
```typescript
app.get('/users', async (request, reply) => {
  const userService = app.container.get<UserService>('UserService')
  const users = await userService.findAll()
  return users
})
```

## Error Handling

### 1. Error Handler Global
```typescript
app.setErrorHandler(async (error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      issues: error.format()
    })
  }

  if (error instanceof PrismaClientKnownRequestError) {
    return reply.status(400).send({
      message: 'Database error',
      code: error.code
    })
  }

  return reply.status(500).send({
    message: 'Internal server error'
  })
})
```

### 2. Not Found Handler
```typescript
app.setNotFoundHandler(async (request, reply) => {
  return reply.status(404).send({
    message: 'Route not found',
    path: request.url
  })
})
```

## Autenticação e Autorização

### 1. Plugin de Autenticação
```typescript
app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
```

### 2. Rotas Protegidas
```typescript
// Rota que requer autenticação
app.get('/profile', {
  preHandler: [app.authenticate]
}, async (request, reply) => {
  return { user: request.user }
})

// Middleware de verificação de role
const requireRole = (role: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== role) {
      return reply.code(403).send({ message: 'Insufficient permissions' })
    }
  }
}
```

## Configuração de Cookies

### 1. Setting Cookies
```typescript
app.post('/login', async (request, reply) => {
  const { accessToken, refreshToken } = await authService.login(credentials)
  
  // Set refresh token como cookie HttpOnly
  reply.setCookie('refreshToken', refreshToken, {
    path: '/',
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
  })

  return { accessToken }
})
```

### 2. Clearing Cookies
```typescript
app.post('/logout', async (request, reply) => {
  reply.clearCookie('refreshToken', {
    path: '/',
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  })

  return { message: 'Logged out successfully' }
})
```

## Performance e Configuração

### 1. Body Limits
```typescript
const app = Fastify({
  bodyLimit: 1048576,              // 1MB para uploads
  keepAliveTimeout: 72000,         // 72 segundos
  connectionTimeout: 60000,        // 60 segundos
  logger: {
    level: env.NODE_ENV === 'development' ? 'debug' : 'info'
  }
})
```

### 2. Rate Limiting
```typescript
import rateLimit from '@fastify/rate-limit'

await app.register(rateLimit, {
  max: 100,                        // 100 requests
  timeWindow: '1 minute',          // por minuto
  errorResponseBuilder: (request, context) => {
    return {
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.ttl} seconds`
    }
  }
})
```

## Logging

### 1. Logger Configuration
```typescript
const app = Fastify({
  logger: {
    level: 'info',
    transport: env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
})
```

### 2. Request Logging
```typescript
app.addHook('onRequest', async (request, reply) => {
  request.log.info({
    method: request.method,
    url: request.url,
    headers: request.headers,
    remoteAddress: request.ip
  }, 'Incoming request')
})
```

## Monitoramento e Health Checks

### 1. Health Check Endpoint
```typescript
app.get('/health', async (request, reply) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version
  }

  try {
    // Verificar conexão com banco
    await app.container.get('PrismaService').healthCheck()
    return healthCheck
  } catch (error) {
    return reply.status(503).send({
      ...healthCheck,
      status: 'error',
      error: error.message
    })
  }
})
```

## Comandos e Scripts

```bash
# Iniciar servidor em desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar servidor em produção
npm start

# Health check
curl http://localhost:3333/health
```

## Links de Referência

- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Fastify TypeScript](https://www.fastify.io/docs/latest/Reference/TypeScript/)
- [Fastify Plugins](https://www.fastify.io/docs/latest/Reference/Plugins/)
- [Fastify Hooks](https://www.fastify.io/docs/latest/Reference/Hooks/)
