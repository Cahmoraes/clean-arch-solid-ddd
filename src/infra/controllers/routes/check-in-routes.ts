export const CheckInRoutes = {
  CREATE: '/check-ins',
} as const

export type CheckInRoutesType =
  (typeof CheckInRoutes)[keyof typeof CheckInRoutes]
