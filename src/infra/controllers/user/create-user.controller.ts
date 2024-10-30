import { inject, injectable } from 'inversify'
import { z } from 'zod'

import type { CreateUserUseCase } from '@/application/use-cases/create-user.usecase'
import { TYPES } from '@/infra/ioc/types'
import type { HttpServer } from '@/infra/server/http-server'

import { UserRoutes } from '../routes/user-routes'

const registerBodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
})

type RegisterBody = z.infer<typeof registerBodySchema>

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
      await this.createUser.execute({
        name,
        email,
        rawPassword: password,
      })
      return { name, email }
    })
  }

  private parseBodyOrThrow(body: unknown): RegisterBody {
    return registerBodySchema.parse(body)
  }
}
