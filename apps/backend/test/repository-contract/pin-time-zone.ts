export function pinTimeZone(zone: string): () => void {
	const previous = process.env.TZ
	process.env.TZ = zone
	if (new Date("2026-03-11T02:30:00.000Z").getDate() !== 10) {
		throw new Error(
			`The process time zone could not be pinned to ${zone}; run the integration config with the default forks pool`,
		)
	}
	return () => {
		if (previous === undefined) {
			Reflect.deleteProperty(process.env, "TZ")
			return
		}
		process.env.TZ = previous
	}
}
