import { ContainerModule } from 'inversify'

import { AuthenticateUseCase } from '@/session/application/use-case/authenticate.usecase'
import { LogoutUseCase } from '@/session/application/use-case/logout.usecase'
import { AuthenticateController } from '@/session/infra/controller/authenticate.controller'
import { SessionDAOMemory } from '@/shared/infra/database/dao/in-memory/session-dao-memory'

import { TYPES } from '../../types'

export const sessionContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.Controllers.Authenticate).to(AuthenticateController)
  bind(TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
  bind(TYPES.UseCases.Logout).to(LogoutUseCase)
  bind(TYPES.DAO.Session).to(SessionDAOMemory).inSingletonScope()
})
