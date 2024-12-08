import 'fastify'

import type { RoleTypes } from '@/domain/value-object/role'

interface Sub {
  id: string
  email: string
  role: RoleTypes
}

interface User {
  sub: Sub
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    user: User
  }
}
