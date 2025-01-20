import { CSVPresenter } from './csv-presenter'
import { JSONPresenter } from './json-presenter'
import type { Presenter } from './presenter'

export const FormatType = {
  JSON: 'application/json',
  CSV: 'text/csv',
} as const

export type FormatTypes = (typeof FormatType)[keyof typeof FormatType]

export class PresenterFactory {
  public static create<Output>(format?: string): Presenter<unknown> {
    switch (format) {
      case FormatType.JSON:
        return new JSONPresenter<Output>()
      case FormatType.CSV:
        return new CSVPresenter()
      default:
        return new JSONPresenter<Output>()
    }
  }
}
