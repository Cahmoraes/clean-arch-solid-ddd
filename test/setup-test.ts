import 'reflect-metadata'

import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { cwd } from 'node:process'

import { config } from 'dotenv'

import { prismaClient } from '@/shared/infra/database/connection/prisma-client'
import { env } from '@/shared/infra/env'

config({
  path: join(cwd(), '.env.development'),
  override: true,
})

// if (env.USE_PRISMA) {
//   execSync('npx dotenv -e .env.development -- npx prisma migrate deploy', {
//     stdio: 'inherit',
//   })
//   prismaSetupTest()
// }

export function prismaSetupTest() {
  beforeAll(async () => {
    try {
      // execSync(
      //   'npx dotenv -e .env.development -- npx prisma migrate reset --force',
      //   { stdio: 'inherit' },
      // )
    } catch (error) {
      if (error instanceof Error) {
        console.error('Erro ao executar prisma migrate reset:', error.message)
      }
      throw error
    }
  })

  afterAll(async () => {
    await prismaClient.$disconnect()
  })
}
