import { Container } from 'inversify'

import { userContainer } from './module/user-container'

export const container = new Container()
container.load(userContainer)
