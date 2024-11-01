import { inject, injectable } from 'inversify'
import { z } from 'zod'

import type { AuthenticateUseCase } from '@/application/use-case/authenticate.usecase'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'

import { UserRoutes } from '../routes/user-routes'

const authenticateRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type AuthenticatePayload = z.infer<typeof authenticateRequestSchema>

@injectable()
export class AuthenticateController {
  constructor(
    @inject(TYPES.AuthenticateUseCase)
    private readonly authenticate: AuthenticateUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('post', UserRoutes.AUTHENTICATE, async (req) => {
      const { email, password } = this.parseBodyOrThrow(req.body)
      const { token } = await this.authenticate.execute({
        email,
        password,
      })
      return { token }
    })
  }

  private parseBodyOrThrow(body: unknown): AuthenticatePayload {
    return authenticateRequestSchema.parse(body)
  }
}
