import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'

import type { UserProfileUseCase } from '@/application/use-case/user-profile.usecase'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

@injectable()
export class MyProfileController implements Controller {
  constructor(
    @inject(TYPES.UseCases.UserProfile)
    private readonly userProfile: UserProfileUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
    this.callback = this.callback.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('get', UserRoutes.ME, {
      callback: this.callback,
      isProtected: true,
    })
  }

  private async callback(req: FastifyRequest) {
    const user = req.user
    const result = await this.userProfile.execute({ userId: user.sub.id })
    if (result.isLeft()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.NOT_FOUND,
        message: 'User not found',
      })
    }
    return ResponseFactory.create({
      status: HTTP_STATUS.OK,
      body: result.value,
    })
  }
}
