import fastify, { FastifyInstance } from 'fastify'

import { env } from '../env'
import type { HandleCallback, HttpServer, METHOD } from './http-server'

export class FastifyAdapter implements HttpServer {
  private readonly _server: FastifyInstance

  constructor() {
    this._server = fastify({})
  }

  public async initialize(): Promise<void> {
    await this.listen()
  }

  public async listen(): Promise<void> {
    try {
      await this._server.listen({
        port: env.PORT,
        host: env.HOST,
      })
      console.log(
        `HTTP Server running 🚀 http://${process.env.HOST}:${process.env.PORT}`,
      )
    } catch (error) {
      console.error(error)
    }
  }

  async register(
    method: METHOD,
    path: string,
    callback: HandleCallback,
  ): Promise<void> {
    this._server[method](path, async (req, res) => {
      try {
        await callback(req, res)
        res.status(201).send()
      } catch (error) {
        res.status(500).send(error)
      }
    })
  }
}
