import type { PrismaClient } from '@prisma/client'
import { inject, injectable } from 'inversify'

import type {
  CheckInRepository,
  SaveResponse,
} from '@/application/check-in/repository/check-in-repository'
import { CheckIn } from '@/domain/check-in/check-in'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'

interface CreateCheckInProps {
  id: string
  created_at: Date
  validated_at: Date | null
  user_id: string
  gym_id: string
  latitude: number
  longitude: number
}

@injectable()
export class PrismaCheckInRepository implements CheckInRepository {
  constructor(
    @inject(TYPES.Prisma.Client)
    private readonly prismaClient: PrismaClient,
  ) {}

  public async save(checkIn: CheckIn): Promise<SaveResponse> {
    const result = await this.prismaClient.checkIn.create({
      data: {
        gym_id: checkIn.gymId,
        user_id: checkIn.userId,
        validated_at: checkIn.validatedAt,
        latitude: checkIn.latitude,
        longitude: checkIn.longitude,
      },
      select: {
        gym_id: true,
      },
    })
    return {
      id: result.gym_id,
    }
  }

  public async checkOfById(id: string): Promise<CheckIn | null> {
    const checkInData = await this.prismaClient.checkIn.findUnique({
      where: {
        id,
      },
    })
    if (!checkInData) return null
    return this.createCheckIn({
      ...checkInData,
      latitude: checkInData.latitude.toNumber(),
      longitude: checkInData.longitude.toNumber(),
    })
  }

  private createCheckIn(props: CreateCheckInProps) {
    return CheckIn.restore({
      id: props.id,
      gymId: props.gym_id,
      userId: props.user_id,
      createdAt: props.created_at,
      validatedAt: props.validated_at ?? undefined,
      userLatitude: props.latitude,
      userLongitude: props.longitude,
      isValidated: !!props.validated_at,
    })
  }

  public async onSameDate(date: Date): Promise<boolean> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    const checkInOnSameDate = await this.prismaClient.checkIn.count({
      where: {
        created_at: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    })
    return checkInOnSameDate > 0
  }

  public async checkInsOfUserId(
    userId: string,
    page: number,
  ): Promise<CheckIn[]> {
    const checkInData = await this.prismaClient.checkIn.findMany({
      where: {
        user_id: userId,
      },
      skip: page * env.ITEMS_PER_PAGE,
      take: env.ITEMS_PER_PAGE,
    })
    return checkInData.map((data) =>
      this.createCheckIn({
        ...data,
        latitude: data.latitude.toNumber(),
        longitude: data.longitude.toNumber(),
      }),
    )
  }

  public async countOfUserId(userId: string): Promise<number> {
    return await this.prismaClient.checkIn.count({
      where: {
        user_id: userId,
      },
    })
  }
}
