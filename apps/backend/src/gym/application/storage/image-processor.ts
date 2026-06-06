export interface ProcessedImage {
	buffer: Buffer
	extension: string
	contentType: string
}

export interface ImageProcessor {
	/**
	 * Re-encoda e recorta (cover) a imagem para o formato e dimensões alvo.
	 * Lança erro quando o input não é uma imagem válida.
	 */
	process(input: Buffer): Promise<ProcessedImage>
}
