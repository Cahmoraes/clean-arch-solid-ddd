export type METHOD = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options'

export interface HandleCallback {
  (request: any, response: any): Promise<any>
}

export interface Handler {
  (method: METHOD, path: string, handleCallback: HandleCallback): Promise<void>
}

export interface HttpServer {
  listen(): Promise<void>
  initialize(): Promise<void>
  register: Handler
}
