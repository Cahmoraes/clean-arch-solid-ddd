import { CheckInUseCase, type CheckInUseCaseInput } from './checkin.usecase'

describe('CheckInUseCase', () => {
  test('Deve criar um check-in', async () => {
    const input: CheckInUseCaseInput = {
      userId: 'any_user_id',
      gymId: 'any_gym_id',
    }
    const checkIn = new CheckInUseCase()
    const result = await checkIn.execute(input)
    expect(result.checkInId).toEqual(expect.any(String))
  })
})
