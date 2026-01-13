import { existsSync, readFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { cwd } from "node:process"
import { DatabaseSync, type StatementSync } from "node:sqlite"
import { injectable } from "inversify"
import { LRUCache } from "lru-cache"

@injectable()
export class SQLiteConnection {
	private static readonly DB_PATH = SQLiteConnection.pathTo("app.db")
	private static readonly SCHEMA_PATH = SQLiteConnection.pathTo("schema.sql")
	private _db: DatabaseSync
	private queries: LRUCache<string, StatementSync>

	constructor() {
		this._db = this.createDatabase()
		this.queries = this.createLRU()
		void this.initialize()
	}

	private createDatabase(): DatabaseSync {
		return new DatabaseSync(SQLiteConnection.DB_PATH)
	}

	private createLRU(): LRUCache<string, StatementSync> {
		return new LRUCache({
			max: 100,
		})
	}

	private static pathTo(fileName: string): string {
		return path.join(cwd(), "database", fileName)
	}

	private initialize(): void {
		this._db.exec(/*sql*/ `
			PRAGMA journal_mode = WAL;
			PRAGMA synchronous = NORMAL;
			PRAGMA cache_size = 10000;
			PRAGMA foreign_keys = ON;
		`)
		this._db.exec(this.loadSchema())
	}

	private loadSchema(): string {
		return readFileSync(SQLiteConnection.SCHEMA_PATH, "utf-8")
	}

	public query(sql: string): StatementSync {
		let stmt = this.queries.get(sql)
		if (!stmt) {
			stmt = this._db.prepare(sql)
			this.queries.set(sql, stmt)
		}
		return stmt
	}

	public resetDatabase(): void {
		void this._db.close()
		if (!existsSync(SQLiteConnection.DB_PATH)) return
		try {
			const walFile = `${SQLiteConnection.DB_PATH}-wal`
			const shmFile = `${SQLiteConnection.DB_PATH}-shm`
			unlinkSync(SQLiteConnection.DB_PATH)
			unlinkSync(walFile)
			unlinkSync(shmFile)
			console.log("🗑️  Banco deletado:", SQLiteConnection.DB_PATH)
		} catch {
			console.log(
				"🗑️  Não foi possível deletar o banco de dados:",
				SQLiteConnection.DB_PATH,
			)
		}
		this._db = this.createDatabase()
		this.initialize()
	}
}
