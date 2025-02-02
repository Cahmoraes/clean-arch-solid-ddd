import type { PrismaClient } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'
import { inject, injectable } from 'inversify'

import type {
  GymRepository,
  SaveGymResult,
} from '@/application/gym/repository/gym-repository'
import type { Coordinate } from '@/domain/check-in/value-object/coordinate'
import { Gym } from '@/domain/gym/gym'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'

export interface GymCreateProps {
  id: string
  title: string
  description: string | null
  phone?: string | null
  latitude: Decimal
  longitude: Decimal
}

@injectable()
export class PrismaGymRepository implements GymRepository {
  constructor(
    @inject(TYPES.Prisma.Client)
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

  private createGym(props: GymCreateProps) {
    return Gym.restore({
      id: props.id,
      title: props.title,
      description: props.description ?? undefined,
      phone: props.phone ? Number(props.phone) : undefined,
      latitude: props.latitude.toNumber(),
      longitude: props.longitude.toNumber(),
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
}
