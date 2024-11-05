import type { HttpServer } from '../server/http-server'

export interface Controller {
  handle(server: HttpServer): Promise<void>
}
