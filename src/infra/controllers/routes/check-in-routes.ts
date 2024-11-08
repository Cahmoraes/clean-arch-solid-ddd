export const CheckInRoutes = {
  CREATE: '/check-ins',
  METRICS: '/check-ins/metrics/:userId',
} as const

export type CheckInRoutesType =
  (typeof CheckInRoutes)[keyof typeof CheckInRoutes]
