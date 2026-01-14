import { existsSync, readFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { cwd } from "node:process"
import Database, {
	type Database as BetterDB,
	type Statement,
} from "better-sqlite3"
import { injectable } from "inversify"
import { LRUCache } from "lru-cache"

@injectable()
export class SQLiteConnection {
	private static readonly DB_PATH = SQLiteConnection.pathTo("app.db")
	private static readonly SCHEMA_PATH = SQLiteConnection.pathTo("schema.sql")
	private _db: BetterDB
	private queries: LRUCache<string, Statement>

	constructor() {
		this._db = this.createDatabase()
		this.queries = this.createLRU()
		this.initialize()
	}

	private createDatabase(): BetterDB {
		return new Database(SQLiteConnection.DB_PATH)
	}

	private createLRU(): LRUCache<string, Statement> {
		return new LRUCache({
			max: 100,
		})
	}

	private static pathTo(fileName: string): string {
		return path.join(cwd(), "database", fileName)
	}

	private initialize(): void {
		this._db.pragma("journal_mode = WAL")
		this._db.pragma("synchronous = NORMAL")
		this._db.pragma("cache_size = 10000")
		this._db.pragma("foreign_keys = ON")
		this._db.exec(this.loadSchema())
	}

	private loadSchema(): string {
		return readFileSync(SQLiteConnection.SCHEMA_PATH, "utf-8")
	}

	public query(sql: string): Statement {
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
