import { injectable } from 'inversify'

export interface CheckInUseCaseInput {
  userId: string
  gymId: string
}

export interface CheckInUseCaseOutput {
  checkInId: string
  date: Date
}

@injectable()
export class CheckInUseCase {
  public async execute(
    input: CheckInUseCaseInput,
  ): Promise<CheckInUseCaseOutput> {
    return {
      checkInId: 'any_checkIn_id',
      date: new Date(),
    }
  }
}
