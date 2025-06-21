export class GymWithCNPJAlreadyExistsError extends Error {
  constructor(aString: string) {
    super(`Academia com CNPJ ${aString} já existe`)
    this.name = 'GymWithCNPJAlreadyExistsError'
  }
}
