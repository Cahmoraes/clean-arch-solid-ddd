import { ContainerModule, type interfaces } from 'inversify'

import { JsonWebTokenAdapter } from '@/infra/auth/json-web-token-adapter'

import { TYPES } from '../../types'

export const infraContainer = new ContainerModule((bind: interfaces.Bind) => {
  bind(TYPES.Tokens.Auth).to(JsonWebTokenAdapter)
})
