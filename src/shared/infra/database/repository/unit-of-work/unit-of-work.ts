export type Callback = (transaction: object) => Promise<any>

export interface UnitOfWork {
  performTransaction(callback: Callback): Promise<any>
}
