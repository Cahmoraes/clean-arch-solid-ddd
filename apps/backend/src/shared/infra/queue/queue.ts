export type ExchangeKind = "direct" | "fanout"

export interface Queue {
	connect(): Promise<void>
	publish<TData>(
		exchange: string,
		data: TData,
		type?: ExchangeKind,
		durable?: boolean,
	): Promise<void>
	consume(queue: string, callback: CallableFunction): Promise<void>
}
