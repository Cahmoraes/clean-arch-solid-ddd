/**
 * Observability — light-weight logger + Web Vitals reporter.
 *
 * - `LOG_LEVEL` is read from `NEXT_PUBLIC_LOG_LEVEL` (defaults to `"info"`).
 * - `logger` exposes `debug | info | warn | error` filtered by current level.
 * - `reportWebVitals` forwards metrics to the configured sink (console by
 *   default). External APMs can be wired by replacing the sink.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent"

const LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
	silent: 100,
}

function normalizeLevel(value: string | undefined): LogLevel {
	if (!value) return "info"
	const lower = value.toLowerCase()
	if (lower in LEVEL_PRIORITY) return lower as LogLevel
	return "info"
}

export function getLogLevel(): LogLevel {
	return normalizeLevel(process.env.NEXT_PUBLIC_LOG_LEVEL)
}

function shouldLog(level: LogLevel): boolean {
	return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getLogLevel()]
}

export interface Logger {
	debug: (...args: unknown[]) => void
	info: (...args: unknown[]) => void
	warn: (...args: unknown[]) => void
	error: (...args: unknown[]) => void
}

export const logger: Logger = {
	debug: (...args) => {
		if (shouldLog("debug")) console.debug("[app]", ...args)
	},
	info: (...args) => {
		if (shouldLog("info")) console.info("[app]", ...args)
	},
	warn: (...args) => {
		if (shouldLog("warn")) console.warn("[app]", ...args)
	},
	error: (...args) => {
		if (shouldLog("error")) console.error("[app]", ...args)
	},
}

export interface WebVitalMetric {
	id: string
	name: string
	label?: string
	value: number
	rating?: string
	delta?: number
}

export type WebVitalSink = (metric: WebVitalMetric) => void

let activeSink: WebVitalSink = (metric) => {
	logger.debug("web-vital", metric.name, metric.value, {
		id: metric.id,
		rating: metric.rating,
	})
}

export function setWebVitalSink(sink: WebVitalSink): void {
	activeSink = sink
}

export function reportWebVitals(metric: WebVitalMetric): void {
	try {
		activeSink(metric)
	} catch (error) {
		console.error("[app] reportWebVitals sink failed", error)
	}
}
