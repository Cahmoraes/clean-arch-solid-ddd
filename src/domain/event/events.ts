export const EVENTS = {
  USER_CREATED: 'userCreated',
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
