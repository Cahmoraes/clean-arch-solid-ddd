export type Callback<T = any> = (transaction: object) => Promise<T>

export interface UnitOfWork {
	runTransaction<TReturn>(callback: Callback<TReturn>): Promise<TReturn>
}
