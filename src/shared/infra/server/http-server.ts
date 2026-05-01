export type METHOD = "get" | "post" | "put" | "delete" | "patch" | "options"

export interface HandleCallbackResponse {
	body: unknown
	status: number
}

export type HandleCallback = (
	request: any,
	response: any,
) => Promise<HandleCallbackResponse>

export type PreHandler = (
	request: any,
	response: any,
	done: any,
) => Promise<void>

export interface HandlerOptions {
	callback: HandleCallback
	isProtected?: boolean
	onlyAdmin?: boolean
}

export interface Schema {
	tags?: string[]
	summary?: string
	description?: string
	body?: unknown
	querystring?: unknown
	params?: unknown
	headers?: unknown
	response?: unknown
	security?: Array<Record<string, string[]>>
}

export type Handler = (
	method: METHOD,
	path: string,
	handlerOptions: HandlerOptions,
	schema?: Schema,
) => Promise<void>

export interface HttpServer {
	listen(): Promise<void>
	close(): Promise<void>
	register: Handler
}
