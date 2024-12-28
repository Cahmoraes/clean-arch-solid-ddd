import 'reflect-metadata'

import { serverBuild } from '@/bootstrap/server-build'

async function main() {
  const server = await serverBuild()
  await server.initialize()
}

main()
