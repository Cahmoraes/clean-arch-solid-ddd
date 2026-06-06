import sharp from "sharp"
import { InvalidImageError } from "@/gym/application/error/invalid-image-error"
import { SharpImageProcessor } from "./sharp-image-processor"

describe("SharpImageProcessor", () => {
	test("re-encoda para webp 800x450 (cover)", async () => {
		const sut = new SharpImageProcessor()
		const input = await sharp({
			create: {
				width: 1200,
				height: 1200,
				channels: 3,
				background: { r: 100, g: 150, b: 200 },
			},
		})
			.png()
			.toBuffer()

		const result = await sut.process(input)

		const meta = await sharp(result.buffer).metadata()
		expect(result.extension).toBe("webp")
		expect(result.contentType).toBe("image/webp")
		expect(meta.format).toBe("webp")
		expect(meta.width).toBe(800)
		expect(meta.height).toBe(450)
	})

	test("lança InvalidImageError para buffer que não é imagem", async () => {
		const sut = new SharpImageProcessor()
		await expect(
			sut.process(Buffer.from("not-an-image")),
		).rejects.toBeInstanceOf(InvalidImageError)
	})
})
