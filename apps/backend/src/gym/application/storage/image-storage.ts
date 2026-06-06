export interface StoredImage {
	key: string
}

export interface ImageStorage {
	/** Persiste o binário e retorna a chave relativa (ex: gyms/<uuid>.webp). */
	save(buffer: Buffer, extension: string): Promise<StoredImage>
	/** Remove o binário identificado pela chave. Ignora ausência. */
	delete(key: string): Promise<void>
}
