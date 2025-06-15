import type { FastifyReply, FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, type ValidationError } from 'zod-validation-error'

import type { AuthToken } from '@/user/application/auth/auth-token'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import type { CookieManager } from '@/infra/cookie/cookie-manager'
import { Logger } from '@/infra/decorator/logger'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'
import type { Logger as DebugLogger } from '@/infra/logger/logger'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import type { Controller } from '@/infra/controller/controller'
import { ResponseFactory } from '@/infra/controller/factory/response-factory'
import { UserRoutes } from './routes/user-routes'

interface Sub {
  sub: string
  email: string
}

interface Cookie {
  refresh_token: string
}

const refreshTokenRequestSchema = z.object({
  cookie: z.string(),
})

type RefreshPayload = z.infer<typeof refreshTokenRequestSchema>

@injectable()
export class RefreshTokenController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(TYPES.Tokens.Auth)
    private readonly authToken: AuthToken,
    @inject(TYPES.Cookies.Manager)
    private readonly cookieManager: CookieManager,
    @inject(TYPES.Logger)
    private readonly logger: DebugLogger,
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
    this.server.register('patch', UserRoutes.REFRESH, {
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
    const cookie = this.cookieParse(cookieOrError.value.cookie)
    const verified = this.authToken.verify<Sub>(
      cookie.refresh_token,
      env.PRIVATE_KEY,
    )
    if (verified.isFailure()) {
      this.warnOnRefreshTokenFailure(cookie, verified.value.message)
      return ResponseFactory.create({
        status: HTTP_STATUS.FORBIDDEN,
        message: verified.value.message,
      })
    }
    const { token, refreshToken } = this.createTokens(verified.value.sub)
    res.header('set-cookie', this.encodeRefreshTokenCookie(refreshToken))
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      message: token,
    })
  }

  private cookieParse(cookie: string): Cookie {
    const parsedCookie = this.cookieManager.parse(cookie)
    return parsedCookie as unknown as Cookie
  }

  private warnOnRefreshTokenFailure(cookie: Cookie, message: string) {
    this.logger.warn(this, {
      cookie: cookie,
      message,
    })
  }

  private createTokens(sub: string) {
    const token = this.authToken.sign(sub, env.PRIVATE_KEY)
    const refreshToken = this.authToken.refreshToken(sub, env.PRIVATE_KEY)
    return { token, refreshToken }
  }

  private encodeRefreshTokenCookie(aString: string): string {
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
