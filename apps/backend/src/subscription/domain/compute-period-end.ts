import type { BillingPeriod } from "./plan"

export function computePeriodEnd(
	start: Date,
	billingPeriod: BillingPeriod,
): Date {
	const monthsToAdd = billingPeriod === "yearly" ? 12 : 1
	const totalMonths = start.getUTCMonth() + monthsToAdd
	const targetYear = start.getUTCFullYear() + Math.floor(totalMonths / 12)
	const targetMonth = totalMonths % 12
	const lastDayOfTargetMonth = new Date(
		Date.UTC(targetYear, targetMonth + 1, 0),
	).getUTCDate()
	const day = Math.min(start.getUTCDate(), lastDayOfTargetMonth)
	return new Date(
		Date.UTC(
			targetYear,
			targetMonth,
			day,
			start.getUTCHours(),
			start.getUTCMinutes(),
			start.getUTCSeconds(),
			start.getUTCMilliseconds(),
		),
	)
}
