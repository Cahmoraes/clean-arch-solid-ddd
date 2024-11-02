export type METHOD = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options'

export interface HandleCallbackResponse {
  body: unknown
  status: number
}

export interface HandleCallback {
  (request: any, response: any): Promise<HandleCallbackResponse>
}

export interface Handler {
  (method: METHOD, path: string, handleCallback: HandleCallback): Promise<void>
}

export interface HttpServer {
  listen(): Promise<void>
  initialize(): Promise<void>
  register: Handler
}
