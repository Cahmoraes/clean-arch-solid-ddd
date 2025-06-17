import { injectable } from 'inversify'

export interface LogoutUseCaseInput {
  userId: string
}

export type LogoutUseCaseOutput = LogoutUseCaseInput

@injectable()
export class LogoutUseCase {
  public async execute(
    input: LogoutUseCaseInput,
  ): Promise<LogoutUseCaseOutput> {
    // const foundSession = this.sessionRepository.sessionOfId()
    return input
  }
}
