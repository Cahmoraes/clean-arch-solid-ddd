import type { Presenter } from './presenter'

export class JSONPresenter<Output> implements Presenter<Output> {
  public format<Input>(data: Input): Output {
    return data as unknown as Output
  }
}
