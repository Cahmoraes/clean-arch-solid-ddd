import { ContainerModule } from 'inversify'

import { AuthenticateController } from '@/session/infra/controller/authenticate.controller'
import { AuthenticateUseCase } from '@/session/application/use-case/authenticate.usecase'

import { TYPES } from '../../types'

export const sessionContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.Controllers.Authenticate).to(AuthenticateController)
  bind(TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
})
