import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, ValidationError } from 'zod-validation-error'

import type { UpdateUserProfileUseCase } from '@/user/application/use-case/update-user-profile.usecase'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { Logger } from '@/infra/decorator/logger'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

const updateUserProfileRequestSchema = z.object({
  userId: z.string(),
})

const updateUserProfileBodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
})

type UpdateUserProfileRequest = z.infer<typeof updateUserProfileRequestSchema>
type UpdateUserProfilePayload = z.infer<typeof updateUserProfileBodySchema>

@injectable()
export class UpdateUserProfileController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(TYPES.UseCases.UpdateUserProfile)
    private readonly updateUserProfile: UpdateUserProfileUseCase,
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
    this.httpServer.register('patch', UserRoutes.PROFILE, {
      callback: this.callback,
    })
  }

  private async callback(req: FastifyRequest) {
    const parseRequestResult = this.parseRequestOrError(req.params)
    if (parseRequestResult.isFailure()) {
      return ResponseFactory.BAD_REQUEST({
        message: parseRequestResult.value.message,
      })
    }
    const parseBodyResult = this.parseBodyOrError(req.body)
    if (parseBodyResult.isFailure()) {
      return ResponseFactory.BAD_REQUEST({
        message: parseBodyResult.value.message,
      })
    }
    const profileUpdateResult = await this.updateUserProfile.execute({
      userId: parseRequestResult.value.userId,
      email: parseBodyResult.value.email,
      name: parseBodyResult.value.name,
    })
    if (profileUpdateResult.isFailure()) {
      return ResponseFactory.UNPROCESSABLE_ENTITY({
        message: profileUpdateResult.value.toString(),
      })
    }
    return ResponseFactory.CREATED({
      body: {
        message: 'User created',
        email: profileUpdateResult.value.email,
      },
    })
  }

  private parseRequestOrError(
    request: unknown,
  ): Either<ValidationError, UpdateUserProfileRequest> {
    const parsedRequest = updateUserProfileRequestSchema.safeParse(request)
    if (!parsedRequest.success) return failure(fromError(parsedRequest.error))
    return success(parsedRequest.data)
  }

  private parseBodyOrError(
    body: unknown,
  ): Either<ValidationError, UpdateUserProfilePayload> {
    const parsedBody = updateUserProfileBodySchema.safeParse(body)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }
}
