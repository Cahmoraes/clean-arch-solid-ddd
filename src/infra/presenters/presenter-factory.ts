import { CSVPresenter } from './csv-presenter'
import { JSONPresenter } from './json-presenter'
import type { Presenter } from './presenter'

type Format = 'json' | 'csv'

export class PresenterFactory {
  public static create<Output>(format?: string): Presenter<unknown> {
    switch (format) {
      case 'json':
        return new JSONPresenter<Output>()
      case 'csv':
        return new CSVPresenter()
      default:
        return new JSONPresenter<Output>()
    }
  }
}
