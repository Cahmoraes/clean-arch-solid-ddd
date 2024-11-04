import {
  CheckIn,
  type CheckInCreateProps,
  type CheckInRestoreProps,
} from './check-in'

describe('CheckIn', () => {
  test('Deve criar um check-in', () => {
    const input: CheckInCreateProps = {
      id: 'any_id',
      userId: 'any_user_id',
      gymId: 'any_gym_id',
    }
    const checkIn = CheckIn.create(input)
    expect(checkIn).toBeInstanceOf(CheckIn)
    expect(checkIn.id).toEqual('any_id')
    expect(checkIn.userId).toEqual('any_user_id')
    expect(checkIn.gymId).toEqual('any_gym_id')
  })

  test('Deve restaurar um CheckIn', () => {
    const input: CheckInRestoreProps = {
      id: 'any_id',
      userId: 'any_user_id',
      gymId: 'any_gym_id',
      createdAt: new Date(),
      validatedAt: new Date(),
    }
    const checkIn = CheckIn.restore(input)
    expect(checkIn).toBeInstanceOf(CheckIn)
    expect(checkIn.id).toEqual('any_id')
    expect(checkIn.userId).toEqual('any_user_id')
    expect(checkIn.gymId).toEqual('any_gym_id')
    expect(checkIn.createdAt).toEqual(input.createdAt)
    expect(checkIn.validatedAt).toEqual(input.validatedAt)
  })
})
