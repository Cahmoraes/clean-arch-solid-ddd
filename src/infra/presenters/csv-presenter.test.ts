import { CSVPresenter } from './csv-presenter'

describe('CSV Presenter', () => {
  let sut: CSVPresenter

  const data = [
    {
      id: 'fake_id',
      role: 'MEMBER',
      createdAt: '2025-01-18T23:48:24.009Z',
      name: 'any_name',
      email: 'any_email',
    },
    {
      id: '53524955-138e-43bc-8939-0c80e32c79ed',
      role: 'MEMBER',
      createdAt: '2025-01-19T10:31:45.365Z',
      name: 'Ms. Madeline Yost',
      email: 'Shanelle_McLaughlin@gmail.com',
    },
  ]

  beforeEach(() => {
    sut = new CSVPresenter()
  })

  test('Deve formatar para CSV', () => {
    const result = sut.format(data)
    expect(result).toMatchSnapshot()
  })
})
