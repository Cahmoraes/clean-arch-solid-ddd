import ExtendedSet from '@cahmoraes93/extended-set'

export class Observable {
  private observers: ExtendedSet<CallableFunction> = new ExtendedSet()

  public addObserver(observer: CallableFunction): void {
    this.observers.add(observer)
  }

  public removeObserver(observer: CallableFunction): void {
    this.observers.delete(observer)
  }

  public async notifyObservers<TData>(data: TData): Promise<void> {
    for (const observer of this.observers) {
      await observer(data)
    }
  }
}
