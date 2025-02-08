type GenericFunction = (...args: any[]) => any

export interface RetryConstructor<Callback extends GenericFunction> {
  callback: Callback
  maxAttempts: number
  time: number
}

export class Retry<Callback extends GenericFunction> {
  private readonly callback: Callback
  private readonly maxAttempts: number
  private readonly time: number
  private _attempts: number

  private constructor(props: RetryConstructor<Callback>) {
    this.callback = props.callback
    this.maxAttempts = props.maxAttempts
    this.time = props.time
    this._attempts = 0
  }

  public static wrap<T extends GenericFunction>(
    props: RetryConstructor<T>,
  ): Retry<T> {
    return new Retry(props)
  }

  public async execute(
    ...args: Parameters<Callback>
  ): Promise<ReturnType<Callback>> {
    try {
      return await this.callback(...args)
    } catch (error) {
      return this.performCatch(error, ...args)
    }
  }

  private async performCatch(
    error: any,
    ...args: Parameters<Callback>
  ): Promise<ReturnType<Callback>> {
    this.incrementAttempts()
    if (this._attempts < this.maxAttempts) {
      await this.sleep(this.time)
      return this.execute(...args)
    }
    throw error
  }

  private incrementAttempts() {
    this._attempts++
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
