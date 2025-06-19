import { ContainerModule } from 'inversify'

import { AuthenticateUseCase } from '@/session/application/use-case/authenticate.usecase'
import { LogoutUseCase } from '@/session/application/use-case/logout.usecase'
import { AuthenticateController } from '@/session/infra/controller/authenticate.controller'
import { LogoutController } from '@/session/infra/controller/logout.controller'

import { TYPES } from '../../types'
import { SessionDAOProvider } from './session-dao-provider'

export const sessionContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.Controllers.Authenticate).to(AuthenticateController)
  bind(TYPES.Controllers.Logout).to(LogoutController)
  bind(TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
  bind(TYPES.UseCases.Logout).to(LogoutUseCase)
  bind(TYPES.DAO.Session)
    .toDynamicValue(SessionDAOProvider.provide)
    .inSingletonScope()
})
