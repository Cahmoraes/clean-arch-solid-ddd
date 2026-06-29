import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
	buildSparklinePath,
	KpiCardWithSparkline,
} from "../kpi-card-with-sparkline"

describe("buildSparklinePath", () => {
	test("retorna linha horizontal array vazio", () => {
		expect(buildSparklinePath([])).toBe("M0,15 L80,15")
	})
	test("retorna linha horizontal para array com um único ponto", () => {
		expect(buildSparklinePath([10])).toBe("M0,15 L80,15")
	})
	test("retorna linha horizontal quando todos os valores são iguais", () => {
		expect(buildSparklinePath([5, 5, 5, 5])).toBe("M0,15 L80,15")
	})
	test("normaliza série crescente para viewBox 0 0 80 30", () => {
		expect(buildSparklinePath([10, 20, 30])).toBe(
			"M0.0,28.0 L40.0,15.0 L80.0,2.0",
		)
	})
})

describe("KpiCardWithSparkline", () => {
	test("exibe valor e label", () => {
		render(
			<KpiCardWithSparkline
				value="1.284"
				label="Check-ins no período"
				sparklineData={[10, 15, 12, 18]}
			/>,
		)
		expect(screen.getByText("1.284")).toBeInTheDocument()
		expect(screen.getByText("Check-ins no período")).toBeInTheDocument()
	})
	test("exibe elemento SVG quando sparklineData tem 2 ou mais pontos", () => {
		const { container } = render(
			<KpiCardWithSparkline
				value="82%"
				label="Taxa de retenção"
				sparklineData={[10, 15, 12, 18]}
			/>,
		)
		expect(container.querySelector("svg")).toBeInTheDocument()
	})
	test("não lança erro com sparklineData de valores todos iguais", () => {
		expect(() =>
			render(
				<KpiCardWithSparkline
					value="100"
					label="Teste"
					sparklineData={[5, 5, 5, 5]}
				/>,
			),
		).not.toThrow()
	})
	test("não exibe SVG quando sparklineData tem menos de 2 pontos", () => {
		const { container } = render(
			<KpiCardWithSparkline value="1" label="L" sparklineData={[5]} />,
		)
		expect(container.querySelector("svg")).not.toBeInTheDocument()
	})
	test("aplica classes de highlight quando highlight=true", () => {
		const { container } = render(
			<KpiCardWithSparkline
				value="82%"
				label="Retenção"
				sparklineData={[]}
				highlight
			/>,
		)
		expect(container.firstChild).toHaveClass("border-primary/35")
	})
	test("exibe Skeleton quando isLoading=true", () => {
		const { container } = render(
			<KpiCardWithSparkline value="" label="" sparklineData={[]} isLoading />,
		)
		expect(
			container.querySelector('[data-testid="skeleton"]'),
		).toBeInTheDocument()
	})
	test("exibe estado de erro quando isError=true", () => {
		render(
			<KpiCardWithSparkline value="" label="" sparklineData={[]} isError />,
		)
		expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument()
	})
})
