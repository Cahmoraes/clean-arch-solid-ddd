import { Container } from 'inversify'

import { checkInModule } from './module/check-in/check-in-module'
import { gymContainer } from './module/gym/gym-container'
import { healthCheckContainer } from './module/health-check/heath-check-container'
import { infraContainer } from './module/infra/infra-container'
import { sessionContainer } from './module/session/session-container'
import { subscriptionContainer } from './module/subscription/subscription-container'
import { userContainer } from './module/user/user-container'

export const container = new Container()
container.load(
  userContainer,
  gymContainer,
  checkInModule,
  infraContainer,
  sessionContainer,
  healthCheckContainer,
  subscriptionContainer,
)
