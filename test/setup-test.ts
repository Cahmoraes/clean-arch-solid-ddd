import 'reflect-metadata'

// import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { cwd } from 'node:process'

// import { Prisma } from '@prisma/client'
import { config } from 'dotenv'

import { prismaClient } from '@/infra/database/connection/prisma-client'
import { env } from '@/infra/env'

// Carrega as variáveis de ambiente de desenvolvimento
config({
  path: join(cwd(), '.env.development'),
  override: true,
})

if (env.USE_PRISMA) {
  // execSync('npx dotenv -e .env.development -- npx prisma migrate deploy', {
  //   stdio: 'inherit',
  // })
  // prismaSetupTest()
}

export function prismaSetupTest() {
  beforeAll(async () => {
    // Limpa e recria o schema apenas uma vez
    await prismaClient.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "public" CASCADE`,
    )

    // Recria o schema 'public'
    // await prismaClient.$executeRaw(Prisma.sql`CREATE SCHEMA public;`)

    // Aplica as migrations no banco de dados de teste
  })

  afterAll(async () => {
    await prismaClient.$disconnect()
  })
}
