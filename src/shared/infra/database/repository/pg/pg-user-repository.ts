import { inject, injectable } from 'inversify'

import { TYPES } from '@/shared/infra/ioc/types'
import type { UserRepository } from '@/user/application/repository/user-repository'
import { User } from '@/user/domain/user'

import type { PgClient } from '../../connection/pg-client'

@injectable()
export class PgUserRepository implements UserRepository {
  constructor(
    @inject(TYPES.PG.Client)
    private readonly pgClient: PgClient,
  ) {
    this.pgClient.connect()
  }

  public async userOfEmail(email: string): Promise<User | null> {
    const result = await this.pgClient.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    )
    const row = result.rows[0]
    return User.restore({
      id: row.id,
      email: row.email,
      name: row.name,
      password: row.password_hash,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
    })
  }

  public async userOfId(id: string): Promise<User | null> {
    const result = await this.pgClient.query(
      'SELECT * FROM users WHERE id = $1',
      [id],
    )
    const row = result.rows[0]
    return User.restore({
      id: row.id,
      email: row.email,
      name: row.name,
      password: row.password_hash,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
    })
  }

  public async save(user: User): Promise<void> {
    await this.pgClient.query(
      'INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now())',
      [user.name, user.email, user.password, user.role],
    )
  }

  public async update(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  public async get(): Promise<User | null> {
    throw new Error('Method not implemented.')
  }
}
