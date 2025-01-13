import 'reflect-metadata'

import { serverBuild } from '@/bootstrap/server-build'

main()

async function main() {
  const server = await serverBuild()
  await server.listen()
}
