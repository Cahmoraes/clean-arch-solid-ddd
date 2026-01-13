import { injectable } from "inversify"

import type { Callback, UnitOfWork } from "./unit-of-work"

@injectable()
export class TestingUnitOfWork implements UnitOfWork {
	public async performTransaction<T>(callback: Callback<T>): Promise<T> {
		return callback({})
	}
}
