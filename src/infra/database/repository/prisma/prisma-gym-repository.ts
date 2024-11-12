import type { PrismaClient } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'
import { inject, injectable } from 'inversify'

import type {
  GymRepository,
  SaveGymResult,
} from '@/application/repository/gym-repository'
import { Gym } from '@/domain/gym'
import { TYPES } from '@/shared/ioc/types'

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
  public ITEMS_PER_PAGE = 20

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

  public async findByTitle(title: string, page: number): Promise<Gym[]> {
    const gymData = await this.prismaClient.gym.findMany({
      where: { title },
      skip: page * this.ITEMS_PER_PAGE,
      take: this.ITEMS_PER_PAGE,
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

  public async findById(id: string): Promise<Gym | null> {
    const gymData = await this.prismaClient.gym.findUnique({
      where: { id },
    })
    if (!gymData) return null
    return this.createGym(gymData)
  }
}
