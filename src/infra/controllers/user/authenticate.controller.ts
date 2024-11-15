import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { AuthenticateUseCase } from '@/application/use-case/authenticate.usecase'
import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

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
    this.callback = this.callback.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('post', UserRoutes.AUTHENTICATE, {
      callback: this.callback,
    })
  }

  private async callback(req: FastifyRequest) {
    const parsedBodyResult = this.parseBodyResult(req.body)
    if (parsedBodyResult.isLeft())
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: parsedBodyResult.value.message,
      })
    const result = await this.authenticate.execute({
      email: parsedBodyResult.value.email,
      password: parsedBodyResult.value.password,
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
  }

  private parseBodyResult(
    body: unknown,
  ): Either<ValidationError, AuthenticatePayload> {
    const parsedBody = authenticateRequestSchema.safeParse(body)
    if (!parsedBody.success) return left(fromError(parsedBody.error))
    return right(parsedBody.data)
  }
}
