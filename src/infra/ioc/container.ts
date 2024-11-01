import { Container } from 'inversify'

import { infraContainer } from './module/infra/infra-container'
import { userContainer } from './module/user/user-container'

export const container = new Container()
container.load(userContainer, infraContainer)
