import 'reflect-metadata'

import { serverBuild } from '@/bootstrap/server-build'

main()

async function main(): Promise<void> {
  const server = await serverBuild()
  await server.listen()
  console.log('PORT:', process.env.PORT)
  console.log('USE_PRISMA:', process.env.USE_PRISMA)
  console.log('DATABASE_URL:', process.env.DATABASE_URL)

  // const pgUserRepository = container.get<PgUserRepository>(TYPES.PG.User)
  // console.log(pgUserRepository)
  // const user = User.create({
  //   email: `caique.moraes@test${Date.now()}.com`,
  //   name: 'Caique Moraes',
  //   password: '123456',
  //   role: 'ADMIN',
  // }).forceSuccess().value

  // save
  // await pgUserRepository.save(user)
  // get
  // const result = await pgUserRepository.userOfEmail(user.email)
  // console.log(result)
}
