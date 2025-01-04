export const EXCHANGES = {
  LOG: 'log',
  USER_CREATED: 'userCreated',
} as const

export type ExchangeTypes = (typeof EXCHANGES)[keyof typeof EXCHANGES]
