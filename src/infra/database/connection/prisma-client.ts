import { PrismaClient } from '@prisma/client'

import { isDevelopment } from '@/infra/env'

export const prismaClient = new PrismaClient({
  log: isDevelopment() ? ['query', 'error'] : [],
})
