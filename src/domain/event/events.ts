export const EVENTS = {
  USER_CREATED: 'userCreated',
  PASSWORD_CHANGED: 'passwordChanged',
  CHECK_IN_CREATED: 'checkInCreated',
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
