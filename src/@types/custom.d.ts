import 'fastify'

interface Sub {
  id: string
  email: string
}

interface User {
  sub: Sub
  iat: number
}

declare module 'fastify' {
  interface FastifyRequest {
    user: User
  }
}
