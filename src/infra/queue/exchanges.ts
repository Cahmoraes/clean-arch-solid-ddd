export const EXCHANGES = {
  LOG: 'log',
  USER_CREATED: 'userCreated',
  PASSWORD_CHANGED: 'passwordChanged',
} as const

export type ExchangeTypes = (typeof EXCHANGES)[keyof typeof EXCHANGES]
