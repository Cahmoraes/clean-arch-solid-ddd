import { inject, injectable } from 'inversify'
import { z } from 'zod'

import type { CreateUserUseCase } from '@/application/use-case/create-user.usecase'
import { StatusCode } from '@/infra/controllers/status-code'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'

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
    @inject(TYPES.CreateUserUseCase)
    private readonly createUser: CreateUserUseCase,
  ) {
    this.bindMethods()
  }

  private bindMethods() {
    this.handle = this.handle.bind(this)
  }

  async handle(server: HttpServer) {
    server.register('post', UserRoutes.CREATE_USER, async (req) => {
      const { name, email, password } = this.parseBodyOrThrow(req.body)
      const result = await this.createUser.execute({
        name,
        email,
        rawPassword: password,
      })
      if (result.isLeft()) {
        return ResponseFactory.create({
          status: StatusCode.CONFLICT(),
          message: result.value.message,
        })
      }
      return ResponseFactory.create({
        status: StatusCode.CREATED(),
        body: {
          message: 'User created',
          email: result.value.email,
        },
      })
    })
  }

  private parseBodyOrThrow(body: unknown): CreateUserPayload {
    return createUserRequestSchema.parse(body)
  }
}
