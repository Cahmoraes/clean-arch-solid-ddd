import { Container } from 'inversify'

import { checkInModule } from './module/check-in/check-in-module'
import { gymContainer } from './module/gym/gym-container'
import { infraContainer } from './module/infra/infra-container'
import { userContainer } from './module/user/user-container'

export const container = new Container()
container.load(userContainer, gymContainer, checkInModule, infraContainer)
