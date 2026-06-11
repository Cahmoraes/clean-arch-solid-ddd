import { injectable } from "inversify"
import sharp from "sharp"

import { InvalidImageError } from "@/gym/application/error/invalid-image-error"
import type {
	ImageProcessor,
	ProcessedImage,
} from "@/gym/application/storage/image-processor"

const TARGET_WIDTH = 800
const TARGET_HEIGHT = 450
const WEBP_QUALITY = 80

@injectable()
export class SharpImageProcessor implements ImageProcessor {
	public async process(input: Buffer): Promise<ProcessedImage> {
		try {
			const buffer = await sharp(input)
				.resize(TARGET_WIDTH, TARGET_HEIGHT, {
					fit: "cover",
					position: "attention",
				})
				.webp({ quality: WEBP_QUALITY })
				.toBuffer()
			return { buffer, extension: "webp", contentType: "image/webp" }
		} catch {
			throw new InvalidImageError()
		}
	}
}
