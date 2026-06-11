import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"

export type PeriodKey = "7d" | "30d" | "3m" | "12m"

const VALID_PERIOD_KEYS: PeriodKey[] = ["7d", "30d", "3m", "12m"]

export class InvalidPeriodError extends Error {
	constructor(key: string) {
		super(
			`Período inválido: '${key}'. Use um de: ${VALID_PERIOD_KEYS.join(", ")}`,
		)
		this.name = "InvalidPeriodError"
	}
}

export class AnalyticsPeriod {
	private constructor(
		readonly from: Date,
		readonly to: Date,
		readonly key: PeriodKey,
	) {}

	static fromKey(key: string): Either<InvalidPeriodError, AnalyticsPeriod> {
		if (!VALID_PERIOD_KEYS.includes(key as PeriodKey)) {
			return failure(new InvalidPeriodError(key))
		}
		const to = new Date()
		const from = new Date()
		switch (key as PeriodKey) {
			case "7d":
				from.setDate(from.getDate() - 7)
				break
			case "30d":
				from.setDate(from.getDate() - 30)
				break
			case "3m":
				from.setMonth(from.getMonth() - 3)
				break
			case "12m":
				from.setFullYear(from.getFullYear() - 1)
				break
		}
		return success(new AnalyticsPeriod(from, to, key as PeriodKey))
	}

	shouldAggregateByWeek(): boolean {
		return this.key === "3m" || this.key === "12m"
	}
}
