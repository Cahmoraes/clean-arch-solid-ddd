import { ContainerModule } from 'inversify'

import { AuthenticateUseCase } from '@/session/application/use-case/authenticate.usecase'
import { LogoutUseCase } from '@/session/application/use-case/logout.usecase'
import { AuthenticateController } from '@/session/infra/controller/authenticate.controller'

import { TYPES } from '../../types'

export const sessionContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.Controllers.Authenticate).to(AuthenticateController)
  bind(TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
  bind(TYPES.UseCases.Logout).to(LogoutUseCase)
})
