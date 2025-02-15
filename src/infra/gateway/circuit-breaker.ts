type AsyncFunction = (...args: any) => Promise<any>

type State = 'open' | 'closed' | 'half-open'

export interface CircuitBreakerConstructor {
  callback: AsyncFunction
  failureThreshold: number
  resetTime: number
}

export class CircuitBreaker {
  private _state: State
  private readonly failureThreshold: number
  private readonly resetTime: number
  private readonly resetTime: number
  private readonly callback: AsyncFunction
  private _nextAttempt: number

  private constructor(props: CircuitBreakerConstructor) {
    this.failureThreshold = props.failureThreshold
    this.resetTime = props.resetTime
    this.callback = props.callback
    this._state = 'closed'
  }

  public static wrap(props: CircuitBreakerConstructor) {
    return new CircuitBreaker(props)
  }

  public async run(...args: any) {
    if (this.isOpen) {
      const now = Date.now()
      if (now < this._nextAttempt) {
        throw new Error('CircuitBreaker is open')
      }
      this.changeToHalfOpen()
    }
    const result = await this.callback(...args)
    console.log(result)
    return result
  }

  private get isOpen(): boolean {
    return this._state === 'open'
  }

  private changeToHalfOpen(): void {
    this._state = 'half-open'
  }

  private close(): void {
    this._state = 'closed'
  }
}
