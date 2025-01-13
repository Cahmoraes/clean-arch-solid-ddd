import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import type { ValidationError } from 'zod-validation-error'
import { fromError } from 'zod-validation-error'

import type { CreateUserUseCase } from '@/application/use-case/create-user.usecase'
import { type Either, failure, success } from '@/domain/value-object/either'
import { RoleValues } from '@/domain/value-object/role'
import { Logger } from '@/infra/decorators/logger'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer, Schema } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import type { Controller } from '../controller'
import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

const createUserRequestSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z
    .enum([RoleValues.ADMIN, RoleValues.MEMBER])
    .optional()
    .default('MEMBER'),
})

type CreateUserPayload = z.infer<typeof createUserRequestSchema>

@injectable()
export class CreateUserController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(TYPES.UseCases.CreateUser)
    private readonly createUser: CreateUserUseCase,
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
    this.httpServer.register(
      'post',
      UserRoutes.CREATE,
      {
        callback: this.callback,
      },
      makeCreateUserControllerSwaggerSchema(),
    )
  }

  private async callback(req: FastifyRequest) {
    const parsedBodyOrError = this.parseBodyOrError(req.body)
    if (parsedBodyOrError.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.BAD_REQUEST,
        message: parsedBodyOrError.value.message,
      })
    }
    const { password, ...rest } = parsedBodyOrError.value
    const result = await this.createUser.execute({
      ...rest,
      rawPassword: password,
    })
    if (result.isFailure()) {
      return ResponseFactory.create({
        status: HTTP_STATUS.CONFLICT,
        message: result.value.message,
      })
    }
    return ResponseFactory.create({
      status: HTTP_STATUS.CREATED,
      body: {
        message: 'User created',
        email: result.value.email,
      },
    })
  }

  private parseBodyOrError(
    body: unknown,
  ): Either<ValidationError, CreateUserPayload> {
    const parsedBody = createUserRequestSchema.safeParse(body)
    if (!parsedBody.success) return failure(fromError(parsedBody.error))
    return success(parsedBody.data)
  }
}

function makeCreateUserControllerSwaggerSchema(): Schema {
  return {
    tags: ['users'],
    summary: 'Create a new user',
    description: 'Endpoint to create a new user with role and credentials.',
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string', minLength: 6 },
        role: {
          type: 'string',
          enum: ['ADMIN', 'MEMBER'],
          default: 'MEMBER',
        },
      },
      required: ['name', 'email', 'password'],
    },
    response: {
      201: {
        description: 'User created successfully',
        type: 'object',
        properties: {
          message: { type: 'string' },
          email: { type: 'string' },
        },
      },
      400: {
        description: 'Bad Request',
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  }
}
