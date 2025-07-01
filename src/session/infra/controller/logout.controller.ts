import type { FastifyReply, FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'

import type { LogoutUseCase } from '@/session/application/use-case/logout.usecase'
import type { Controller } from '@/shared/infra/controller/controller'
import { ResponseFactory } from '@/shared/infra/controller/factory/response-factory'
import type { CookieManager } from '@/shared/infra/cookie/cookie-manager'
import { Logger } from '@/shared/infra/decorator/logger'
import { env } from '@/shared/infra/env'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'
import type { HttpServer } from '@/shared/infra/server/http-server'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

import { SessionRoutes } from './routes/session-routes'

@injectable()
export class LogoutController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(AUTH_TYPES.UseCases.Logout)
    private readonly logout: LogoutUseCase,
    @inject(AUTH_TYPES.Cookies.Manager)
    private readonly cookieManager: CookieManager,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: '✅ | 🔒',
  })
  public async init() {
    this.server.register(
      'post',
      SessionRoutes.LOGOUT,
      {
        callback: this.callback,
        isProtected: true,
      },
      {
        tags: ['session'],
        description: 'Logout user and revoke session',
        response: {
          204: {
            description: 'Logout successful',
            type: 'null',
          },
          401: {
            description: 'Session already revoked',
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    )
  }

  private async callback(req: FastifyRequest, res: FastifyReply) {
    const user = req.user
    const result = await this.logout.execute({
      jwi: user.sub.jwi,
      userId: user.sub.id,
    })

    if (result.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: 'Session already revoked',
      })
    }

    // Clear the refresh token cookie
    res.header('set-cookie', this.clearRefreshTokenCookie())

    return ResponseFactory.create({
      status: HTTP_STATUS.NO_CONTENT,
    })
  }

  private clearRefreshTokenCookie(): string {
    return this.cookieManager.serialize(env.REFRESH_TOKEN_NAME, '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: new Date(0), // Set expiry to past date to clear cookie
    })
  }
}
