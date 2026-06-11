export interface CropArea {
	x: number
	y: number
	width: number
	height: number
}

/** Recorta a imagem (object URL) na área informada e retorna um Blob webp. */
export async function getCroppedBlob(
	imageSrc: string,
	area: CropArea,
): Promise<Blob> {
	const image = await loadImage(imageSrc)
	const canvas = document.createElement("canvas")
	canvas.width = area.width
	canvas.height = area.height
	const ctx = canvas.getContext("2d")
	if (!ctx) throw new Error("Canvas 2D context unavailable")
	ctx.drawImage(
		image,
		area.x,
		area.y,
		area.width,
		area.height,
		0,
		0,
		area.width,
		area.height,
	)
	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob)
				else reject(new Error("Falha ao gerar a imagem recortada"))
			},
			"image/webp",
			0.9,
		)
	})
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.addEventListener("load", () => resolve(image))
		image.addEventListener("error", () =>
			reject(new Error("Falha ao carregar a imagem")),
		)
		image.src = src
	})
}
