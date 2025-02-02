import { CSVPresenter } from './csv-presenter'
import { JSONPresenter } from './json-presenter'
import type { Presenter } from './presenter'

export const MimeType = {
  JSON: 'application/json',
  CSV: 'text/csv',
} as const

export type MimeTypes = (typeof MimeType)[keyof typeof MimeType]

export class PresenterFactory {
  public static create(mimeType?: string): Presenter {
    switch (mimeType) {
      case MimeType.JSON:
        return new JSONPresenter()
      case MimeType.CSV:
        return new CSVPresenter()
      default:
        return new JSONPresenter()
    }
  }
}
