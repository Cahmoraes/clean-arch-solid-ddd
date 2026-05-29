interface FontOptions {
	subsets?: string[]
	variable?: string
	display?: string
	weight?: string | string[]
}
interface FontResult {
	variable: string
	className: string
	style: { fontFamily: string }
}
function makeFontMock(fallbackVar: string) {
	return (options: FontOptions = {}): FontResult => {
		const variable = options.variable ?? fallbackVar
		return {
			variable,
			className: variable.replace(/^--font-/, "font-"),
			style: { fontFamily: variable },
		}
	}
}
export const Inter = makeFontMock("--font-inter")
export const Space_Grotesk = makeFontMock("--font-space-grotesk")
export const JetBrains_Mono = makeFontMock("--font-jetbrains-mono")
export const Roboto = makeFontMock("--font-roboto")
export const Open_Sans = makeFontMock("--font-open-sans")
