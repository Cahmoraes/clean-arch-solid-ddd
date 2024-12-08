import type { FastifyReply, FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { AuthToken } from '@/application/interfaces/auth-token'
import { type Either, failure, success } from '@/domain/value-object/either'
import type { CookieManager } from '@/infra/cookie/cookie-manager'
import { Logger } from '@/infra/decorators/logger'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

interface Sub {
  sub: string
  email: string
}

const refreshTokenRequestSchema = z.object({
  cookie: z.string(),
})

type RefreshPayload = z.infer<typeof refreshTokenRequestSchema>

@injectable()
export class RefreshTokenController implements Controller {
  constructor(
    @inject(TYPES.Tokens.Auth)
    private readonly authToken: AuthToken,
    @inject(TYPES.Cookies.Manager)
    private readonly cookieManager: CookieManager,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: 'Registrado',
  })
  async handle(server: HttpServer) {
    server.register('patch', UserRoutes.REFRESH, {
      callback: this.callback,
    })
  }

  private async callback(req: FastifyRequest, res: FastifyReply) {
    const cookieOrError = this.parseHeaderResult(req.headers)
    if (cookieOrError.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: cookieOrError.value.message,
      })
    }
    const cookie = this.cookieManager.parse(cookieOrError.value.cookie)
    const verified = this.authToken.verify<Sub>(
      cookie.refreshToken,
      env.PRIVATE_KEY,
    )
    if (verified.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.FORBIDDEN,
        message: verified.value.message,
      })
    }
    const token = this.authToken.sign(verified.value.sub, env.PRIVATE_KEY)
    const refreshToken = this.authToken.refreshToken(
      verified.value.sub,
      env.PRIVATE_KEY,
    )
    res.header('set-cookie', this.encodeRefreshTokenCookie(refreshToken))
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      message: token,
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

  private parseHeaderResult(
    headers: unknown,
  ): Either<ValidationError, RefreshPayload> {
    const parsedBody = refreshTokenRequestSchema.safeParse(headers)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }
}
