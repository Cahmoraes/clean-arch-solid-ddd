import 'fastify'

import type { RoleTypes } from '@/user/domain/value-object/role'

interface Sub {
  id: string
  email: string
  role: RoleTypes
  jwi: string
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
