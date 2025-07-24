export type Callback<T = any> = (transaction: object) => Promise<T>

export interface UnitOfWork {
  performTransaction<T>(callback: Callback<T>): Promise<T>
}
