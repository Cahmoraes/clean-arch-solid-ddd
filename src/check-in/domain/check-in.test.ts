import { CheckInTimeExceededError } from '@/check-in/domain/error/check-in-time-exceeded-error'

import {
  CheckIn,
  type CheckInCreateProps,
  type CheckInRestoreProps,
} from './check-in'

describe('CheckIn Entity', () => {
  test('Deve criar um check-in', () => {
    const input: CheckInCreateProps = {
      id: 'any_id',
      userId: 'any_user_id',
      gymId: 'any_gym_id',
      userLatitude: 0,
      userLongitude: 10,
    }
    const checkIn = CheckIn.create(input)
    expect(checkIn).toBeInstanceOf(CheckIn)
    expect(checkIn.id).toEqual('any_id')
    expect(checkIn.userId).toEqual('any_user_id')
    expect(checkIn.gymId).toEqual('any_gym_id')
    expect(checkIn.createdAt).toEqual(expect.any(Date))
    expect(checkIn.validatedAt).toBeUndefined()
    expect(checkIn.latitude).toEqual(0)
    expect(checkIn.longitude).toEqual(10)
  })

  test('Deve restaurar um CheckIn', () => {
    const input: CheckInRestoreProps = {
      isValidated: true,
      id: 'any_id',
      userId: 'any_user_id',
      gymId: 'any_gym_id',
      createdAt: new Date(),
      validatedAt: new Date(),
      userLatitude: 0,
      userLongitude: 0,
    }
    const checkIn = CheckIn.restore(input)
    expect(checkIn).toBeInstanceOf(CheckIn)
    expect(checkIn.id).toEqual('any_id')
    expect(checkIn.userId).toEqual('any_user_id')
    expect(checkIn.gymId).toEqual('any_gym_id')
    expect(checkIn.createdAt).toEqual(input.createdAt)
    expect(checkIn.validatedAt).toEqual(input.validatedAt)
    expect(checkIn.latitude).toEqual(0)
    expect(checkIn.longitude).toEqual(0)
  })

  test('Deve validar um check-in', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2021-01-01'))
    const input: CheckInCreateProps = {
      id: 'any_id',
      userId: 'any_user_id',
      gymId: 'any_gym_id',
      userLatitude: 0,
      userLongitude: 10,
    }
    const checkIn = CheckIn.create(input)
    checkIn.validate()
    expect(checkIn.isValidated).toBe(true)
    expect(checkIn.validatedAt).toBeInstanceOf(Date)
    expect(checkIn.validatedAt).toEqual(new Date('2021-01-01'))
    vi.useRealTimers()
  })

  test('Não deve validar um check-in após o tempo limite', async () => {
    vi.useFakeTimers()
    const input: CheckInCreateProps = {
      id: 'any_id',
      userId: 'any_user_id',
      gymId: 'any_gym_id',
      userLatitude: 0,
      userLongitude: 10,
    }
    const checkIn = CheckIn.create(input)
    const TWENTY_ON_MINUTES = 1000 * 60 * 21
    vi.advanceTimersByTime(TWENTY_ON_MINUTES)
    const result = checkIn.validate()
    expect(checkIn.isValidated).toBe(false)
    expect(result.forceFailure().value).toBeInstanceOf(CheckInTimeExceededError)
    vi.useRealTimers()
  })
})
