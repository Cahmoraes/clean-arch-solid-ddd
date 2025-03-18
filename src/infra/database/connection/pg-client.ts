import { injectable } from 'inversify'
import pg from 'pg'

@injectable()
export class PgClient {
  private connection: pg.Client

  constructor() {
    this.connection = new pg.Client({
      user: 'docker',
      password: 'docker',
      host: 'localhost',
      database: 'apisolid',
      port: 5432,
    })
  }

  public async connect(): Promise<void> {
    await this.connection.connect()
  }

  public async disconnect(): Promise<void> {
    await this.connection.end()
  }

  public async query(queryString: string, params: any[]) {
    return this.connection.query(queryString, params)
  }
}
