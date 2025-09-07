export type Callback<T = any> = (transaction: object) => Promise<T>

export interface UnitOfWork {
  performTransaction<TReturn>(callback: Callback<TReturn>): Promise<TReturn>
}
