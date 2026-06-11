export interface Queue {
	connect(): Promise<void>
	publish<TData>(exchange: string, data: TData): Promise<void>
	consume(queue: string, callback: CallableFunction): Promise<void>
}
