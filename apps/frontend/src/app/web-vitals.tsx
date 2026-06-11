"use client"

import { useReportWebVitals } from "next/web-vitals"
import { reportWebVitals } from "@/lib/observability"

/**
 * Client-only bridge that wires Next.js Web Vitals into the observability
 * sink. Mounted once at the root layout.
 */
export function WebVitalsReporter(): null {
	useReportWebVitals((metric) => {
		reportWebVitals({
			id: metric.id,
			name: metric.name,
			label: metric.label,
			value: metric.value,
			rating: (metric as { rating?: string }).rating,
			delta: metric.delta,
		})
	})
	return null
}
