type AsyncFunction = (...args: any) => Promise<any>
type State = 'open' | 'closed' | 'half-open'

export interface CircuitBreakerConstructor {
  callback: AsyncFunction
  failureThresholdPercentageLimit: number
  resetTimeout: number
}

export class CircuitBreaker {
  private _totalRequests: number
  private _totalFailures: number
  private _totalSuccess: number
  private _state: State
  private _lastFailureTime: number | null
  private readonly callback: AsyncFunction
  private readonly failureThresholdPercentageLimit: number
  private readonly resetTimeout: number

  private constructor(props: CircuitBreakerConstructor) {
    this._state = 'closed'
    this._totalRequests = 0
    this._totalFailures = 0
    this._totalSuccess = 0
    this._lastFailureTime = null
    this.callback = props.callback
    this.failureThresholdPercentageLimit = props.failureThresholdPercentageLimit
    this.resetTimeout = props.resetTimeout
  }

  public static wrap(props: CircuitBreakerConstructor): CircuitBreaker {
    return new CircuitBreaker(props)
  }

  public async run(): Promise<any> {
    try {
      return await this.performSuccess()
    } catch {
      this.performCatch()
      return 'error'
    }
  }

  private get isClosed(): boolean {
    return this._state === 'closed'
  }

  private get isOpen(): boolean {
    return this._state === 'open'
  }

  private get isHalfOpen(): boolean {
    return this._state === 'half-open'
  }

  private incrementTotalRequests(): void {
    this._totalRequests++
  }

  private incrementTotalSuccess(): void {
    this._totalSuccess++
  }

  private async performSuccess(): Promise<any> {
    this.incrementTotalRequests()
    const result = await this.callback()
    this.incrementTotalSuccess()
    return result
  }

  private performCatch() {
    this.incrementTotalFailures()
    this.updateLastFailureTime()
    if (this.exceedFailureThreshold) {
      this.openCircuit()
      this.scheduleReset()
    }
  }

  private incrementTotalFailures(): void {
    this._totalFailures++
  }

  private updateLastFailureTime(): void {
    this._lastFailureTime = Date.now()
  }

  private openCircuit(): void {
    this._state = 'open'
  }

  private scheduleReset(): void {
    setTimeout(() => {
      this.halfOpen()
    }, this.resetTimeout)
  }

  private halfOpen(): void {
    this._state = 'half-open'
  }

  private get failureThresholdPercentage(): number {
    return this._totalRequests === 0
      ? 0
      : (this._totalFailures / this._totalRequests) * 100
  }

  private get successThresholdPercentage(): number {
    return this._totalRequests === 0
      ? 0
      : (this._totalSuccess / this._totalRequests) * 100
  }

  private get exceedFailureThreshold(): boolean {
    return (
      this.failureThresholdPercentage > this.failureThresholdPercentageLimit
    )
  }
}
