type FontResult = {
	className: string
	variable: string
	style: { fontFamily: string; fontWeight?: number; fontStyle?: string }
}

function createFontMock(): FontResult {
	return {
		className: "mock-font",
		variable: "mock-font-variable",
		style: { fontFamily: "mock-font" },
	}
}

export const Inter = (): FontResult => createFontMock()
export const Roboto = (): FontResult => createFontMock()
export const Open_Sans = (): FontResult => createFontMock()
