import { inject, injectable } from 'inversify'
import { z } from 'zod'

import type { AuthenticateUseCase } from '@/application/use-case/authenticate.usecase'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'
import { TYPES } from '@/shared/ioc/types'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

const authenticateRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type AuthenticatePayload = z.infer<typeof authenticateRequestSchema>

@injectable()
export class AuthenticateController implements Controller {
  constructor(
    @inject(TYPES.UseCases.Authenticate)
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
      const result = await this.authenticate.execute({
        email,
        password,
      })
      if (result.isLeft()) {
        return ResponseFactory.create({
          status: HTTP_STATUS.UNAUTHORIZED,
          message: 'Invalid credentials',
        })
      }
      return ResponseFactory.create({
        status: HTTP_STATUS.OK,
        body: result.value,
      })
    })
  }

  private parseBodyOrThrow(body: unknown): AuthenticatePayload {
    return authenticateRequestSchema.parse(body)
  }
}
