import { inject, injectable } from 'inversify'
import { z } from 'zod'
import type { ValidationError } from 'zod-validation-error'
import { fromError } from 'zod-validation-error'

import { type Either, left, right } from '@/application/either'
import type { CreateUserUseCase } from '@/application/use-case/create-user.usecase'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'
import { HTTP_STATUS } from '@/infra/server/http-status'

import { ResponseFactory } from '../factory/response-factory'
import { UserRoutes } from '../routes/user-routes'

const createUserRequestSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
})

type CreateUserPayload = z.infer<typeof createUserRequestSchema>

@injectable()
export class CreateUserController {
  constructor(
    @inject(TYPES.UseCases.CreateUser)
    private readonly createUser: CreateUserUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('post', UserRoutes.CREATE_USER, async (req) => {
      const parsedBodyOrError = this.parseBody(req.body)
      if (parsedBodyOrError.isLeft()) {
        return ResponseFactory.create({
          status: HTTP_STATUS.BAD_REQUEST,
          message: parsedBodyOrError.value.message,
        })
      }
      const { name, email, password } = parsedBodyOrError.value
      const result = await this.createUser.execute({
        name,
        email,
        rawPassword: password,
      })
      if (result.isLeft()) {
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
    })
  }

  private parseBody(body: unknown): Either<ValidationError, CreateUserPayload> {
    const parsedBody = createUserRequestSchema.safeParse(body)
    if (!parsedBody.success) return left(fromError(parsedBody.error))
    return right(parsedBody.data)
  }
}
