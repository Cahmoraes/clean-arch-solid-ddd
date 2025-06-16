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
      this.incrementTotalRequests()
      return await this.performRun()
    } catch (e) {
      this.performCatch()
      throw e
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

  private async performRun(): Promise<any> {
    this.incrementTotalSuccess()
    if (this.checkHalfOpenEligibility) this.halfOpen()
    if (this.isOpen) throw new OpenCircleError()
    const result = await this.callback()
    if (this.shouldCloseCircuit) this.close()
    return result
  }

  private get checkHalfOpenEligibility(): boolean {
    return this.isOpen && this.shouldEnterHalfOpenState
  }

  private get shouldEnterHalfOpenState(): boolean {
    return (
      Boolean(this._lastFailureTime) &&
      Date.now() - this._lastFailureTime! > this.resetTimeout
    )
  }

  private get shouldCloseCircuit(): boolean {
    return (
      this._state === 'half-open' &&
      this._totalSuccess >= this.successThresholdPercentage
    )
  }

  private performCatch() {
    this.incrementTotalFailures()
    this.updateLastFailureTime()
    if (this.hasExceedFailureThreshold) {
      this.open()
      this.scheduleReset()
    }
  }

  private incrementTotalFailures(): void {
    this._totalFailures++
  }

  private updateLastFailureTime(): void {
    this._lastFailureTime = Date.now()
  }

  private open(): void {
    this._state = 'open'
  }

  private close(): void {
    this._state = 'closed'
    this._totalSuccess = 0
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

  private get hasExceedFailureThreshold(): boolean {
    return (
      this.failureThresholdPercentage > this.failureThresholdPercentageLimit
    )
  }
}

export class OpenCircleError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super('⚡ Circuito ABERTO: Chamadas bloqueadas.', errorOptions)
    this.name = 'OpenCircleError'
  }
}
