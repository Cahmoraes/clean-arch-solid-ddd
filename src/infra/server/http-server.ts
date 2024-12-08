export type METHOD = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options'

export interface HandleCallbackResponse {
  body: unknown
  status: number
}

export interface HandleCallback {
  (request: any, response: any): Promise<HandleCallbackResponse>
}

export interface PreHandler {
  (request: any, response: any, done: any): Promise<void>
}

export interface HandlerOptions {
  callback: HandleCallback
  isProtected?: boolean
  onlyAdmin?: boolean
}

export interface Handler {
  (method: METHOD, path: string, handlerOptions: HandlerOptions): Promise<void>
}

export interface HttpServer {
  listen(): Promise<void>
  initialize(): Promise<void>
  register: Handler
}
