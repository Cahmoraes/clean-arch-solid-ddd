import { PrismaClient } from '@prisma/client'

import { isDevelopment } from '@/shared/env'

export const prismaClient = new PrismaClient({
  log: isDevelopment() ? ['query', 'error'] : [],
})
