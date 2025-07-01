import type { PrismaClient } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'
import { inject, injectable } from 'inversify'

import type { Coordinate } from '@/check-in/domain/value-object/coordinate'
import type {
  GymRepository,
  SaveGymResult,
} from '@/gym/application/repository/gym-repository'
import { Gym } from '@/gym/domain/gym'
import { env } from '@/shared/infra/env'
import { SHARED_TYPES } from '@/shared/infra/ioc/types'

export interface GymCreateProps {
  id: string
  title: string
  description: string | null
  phone?: string | null
  latitude: Decimal
  longitude: Decimal
  cnpj: string
}

@injectable()
export class PrismaGymRepository implements GymRepository {
  constructor(
    @inject(SHARED_TYPES.Prisma.Client)
    private readonly prismaClient: PrismaClient,
  ) {}

  public async save(gym: Gym): Promise<SaveGymResult> {
    const result = await this.prismaClient.gym.create({
      data: {
        id: gym.id ?? undefined,
        title: gym.title,
        description: gym.description,
        phone: gym.phone ? gym.phone.toString() : undefined,
        latitude: gym.latitude,
        longitude: gym.longitude,
        cnpj: gym.cnpj,
      },
      select: { id: true },
    })
    return { id: result.id }
  }

  public async gymOfTitle(title: string, page: number): Promise<Gym[]> {
    const gymData = await this.prismaClient.gym.findMany({
      where: { title },
      skip: page * env.ITEMS_PER_PAGE,
      take: env.ITEMS_PER_PAGE,
    })
    return gymData.map(this.createGym)
  }

  private createGym(props: GymCreateProps): Gym {
    return Gym.restore({
      id: props.id,
      title: props.title,
      description: props.description ?? undefined,
      phone: props.phone ? props.phone : undefined,
      latitude: props.latitude.toNumber(),
      longitude: props.longitude.toNumber(),
      cnpj: props.cnpj,
    })
  }

  public async gymOfId(id: string): Promise<Gym | null> {
    const gymData = await this.prismaClient.gym.findUnique({
      where: { id },
    })
    if (!gymData) return null
    return this.createGym(gymData)
  }

  public async fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]> {
    const gyms = await this.prismaClient.$queryRaw<GymCreateProps[]>`
      SELECT * FROM "gyms"
      WHERE ST_DistanceSphere(
        ST_MakePoint("longitude", "latitude"),
        ST_MakePoint(${coordinate.longitude}, ${coordinate.latitude})
      ) <= 10000
    `
    return gyms.map(this.createGym)
  }

  public async gymOfCNPJ(cnpj: string): Promise<Gym | null> {
    const gymDataOrNull = await this.prismaClient.gym.findUnique({
      where: {
        cnpj,
      },
    })
    if (!gymDataOrNull) return null
    return this.createGym(gymDataOrNull)
  }
}
