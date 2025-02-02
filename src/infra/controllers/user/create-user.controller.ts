import type { FastifyRequest } from 'fastify'
import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { fromError, ValidationError } from 'zod-validation-error'

import { UserAlreadyExistsError } from '@/application/user/error/user-already-exists-error'
import type {
  CreateUserError,
  CreateUserUseCase,
} from '@/application/user/use-case/create-user.usecase'
import {
  type Either,
  type Failure,
  failure,
  success,
} from '@/domain/shared/value-object/either'
import { RoleValues } from '@/domain/user/value-object/role'
import { Logger } from '@/infra/decorators/logger'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer, Schema } from '@/infra/server/http-server'

import type { Controller } from '../controller'
import {
  ResponseFactory,
  type ResponseOutput,
} from '../factory/response-factory'
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
    const parseBodyResult = this.parseBodyOrError(req.body)
    if (parseBodyResult.isFailure()) {
      return ResponseFactory.BAD_REQUEST({
        message: parseBodyResult.value.message,
      })
    }
    const { password, ...rest } = parseBodyResult.value
    const createUserResult = await this.createUser.execute({
      ...rest,
      rawPassword: password,
    })
    if (createUserResult.isFailure()) {
      return this.createResponseError(createUserResult)
    }
    return ResponseFactory.CREATED({
      body: {
        message: 'User created',
        email: createUserResult.value.email,
      },
    })
  }

  private parseBodyOrError(
    body: unknown,
  ): Either<ValidationError, CreateUserPayload> {
    const createUserValidationResult = createUserRequestSchema.safeParse(body)
    if (!createUserValidationResult.success) {
      return failure(fromError(createUserValidationResult.error))
    }
    return success(createUserValidationResult.data)
  }

  private createResponseError(
    result: Failure<CreateUserError, unknown>,
  ): ResponseOutput {
    if (result.value instanceof UserAlreadyExistsError) {
      return ResponseFactory.CONFLICT({
        message: result.value.message,
      })
    }
    return ResponseFactory.UNPROCESSABLE_ENTITY({
      message: result.value.message,
    })
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
