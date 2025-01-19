import type { Presenter } from './presenter'

export class CSVPresenter implements Presenter<string> {
  public format<Input extends Array<any>>(data: Input): string {
    const headers = this.extractHeaders(data)
    const rows = this.extractValues(data)
    return `${headers}\n${rows}`
  }

  private extractHeaders(headers: any): string {
    return Object.keys(headers[0]).join(',')
  }

  private extractValues(rows: any[]): string {
    const values: any[] = []
    for (const [, rowValues] of rows.entries()) {
      for (const value of Object.values(rowValues)) {
        console.log(value)
        values.push(value)
      }
    }
    return values.join(',')
  }
}
