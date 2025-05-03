import ExtendedSet from '@cahmoraes93/extended-set'

export class Observable {
  private observers: ExtendedSet<CallableFunction> = new ExtendedSet()

  public subscribe(observer: CallableFunction): void {
    this.observers.add(observer)
  }

  public unsubscribe(observer: CallableFunction): void {
    this.observers.delete(observer)
  }

  public async notify<Event>(event: Event): Promise<void> {
    for (const observer of this.observers) {
      await observer(event)
    }
  }
}
