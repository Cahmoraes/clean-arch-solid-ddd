import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["src/main.ts"],
	outDir: "build",
	format: ["esm"],
	clean: true,
	minify: true,
})
