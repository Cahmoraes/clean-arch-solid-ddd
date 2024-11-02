import { Container } from 'inversify'

import { gymContainer } from './module/gym/gym-container'
import { infraContainer } from './module/infra/infra-container'
import { userContainer } from './module/user/user-container'

export const container = new Container()
container.load(userContainer, gymContainer, infraContainer)
