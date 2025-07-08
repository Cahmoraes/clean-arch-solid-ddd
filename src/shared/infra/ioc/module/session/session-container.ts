import { ContainerModule } from 'inversify'

import { AuthenticateUseCase } from '@/session/application/use-case/authenticate.usecase'
import { LogoutUseCase } from '@/session/application/use-case/logout.usecase'
import { AuthenticateController } from '@/session/infra/controller/authenticate.controller'
import { LogoutController } from '@/session/infra/controller/logout.controller'

import { AUTH_TYPES } from '../../types'
import { RevokedTokenDAOProvider } from './revoked-token-dao-provider'

export const sessionContainer = new ContainerModule(({ bind }) => {
  bind(AUTH_TYPES.Controllers.Authenticate).to(AuthenticateController)
  bind(AUTH_TYPES.Controllers.Logout).to(LogoutController)
  bind(AUTH_TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
  bind(AUTH_TYPES.UseCases.Logout).to(LogoutUseCase)
  bind(AUTH_TYPES.DAO.RevokedToken)
    .toDynamicValue(RevokedTokenDAOProvider.provide)
    .inSingletonScope()
})
