export const EVENTS = {
  USER_CREATED: 'userCreated',
  PASSWORD_CHANGED: 'passwordChanged',
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
