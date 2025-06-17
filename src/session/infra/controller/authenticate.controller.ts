import type { FastifyReply, FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { AuthenticateUseCase } from '@/session/application/use-case/authenticate.usecase'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import type { CookieManager } from '@/shared/infra/cookie/cookie-manager'
import { Logger } from '@/shared/infra/decorator/logger'
import { env } from '@/shared/infra/env'
import { TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

import { SessionRoutes } from './routes/session-routes'

const authenticateRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type AuthenticatePayload = z.infer<typeof authenticateRequestSchema>

@injectable()
export class AuthenticateController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(TYPES.UseCases.Authenticate)
    private readonly authenticate: AuthenticateUseCase,
    @inject(TYPES.Cookies.Manager)
    private readonly cookieManager: CookieManager,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅',
  })
  public async init() {
    this.server.register('post', SessionRoutes.AUTHENTICATE, {
      callback: this.callback,
    })
  }

  private async callback(req: FastifyRequest, res: FastifyReply) {
    const parsedBodyResult = this.parseBodyResult(req.body)
    if (parsedBodyResult.isFailure())
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: parsedBodyResult.value.message,
      })
    const result = await this.authenticate.execute({
      email: parsedBodyResult.value.email,
      password: parsedBodyResult.value.password,
    })
    if (result.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: 'Invalid credentials',
      })
    }
    res.header(
      'set-cookie',
      this.encodeRefreshTokenCookie(result.value.refreshToken),
    )
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: result.value,
    })
  }

  private encodeRefreshTokenCookie(aString: string) {
    return this.cookieManager.serialize(env.REFRESH_TOKEN_NAME, aString, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    })
  }

  private parseBodyResult(
    body: unknown,
  ): Either<ValidationError, AuthenticatePayload> {
    const parsedBody = authenticateRequestSchema.safeParse(body)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }
}
