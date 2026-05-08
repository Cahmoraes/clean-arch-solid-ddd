#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const HELP = `
generate-slugs.js — Extract Portuguese user stories from a PRD.

Usage:
  node scripts/generate-slugs.js --prd <path>

Options:
  --prd <path>  Path to the PRD markdown file
  --help        Show usage and exit 0
`.trimStart();

function usage(message) {
	process.stderr.write(`Error: ${message}\n\nRun with --help for usage.\n`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = argv.slice(2);
	if (args.includes("--help") || args.includes("-h")) {
		process.stdout.write(`${HELP}\n`);
		process.exit(0);
	}
	let prdPath = null;
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === "--prd") {
			if (!args[index + 1]) usage("--prd <path> is required");
			prdPath = path.resolve(args[index + 1]);
			index += 1;
			continue;
		}
		usage(`Unknown argument: ${arg}`);
	}
	if (!prdPath) usage("--prd <path> is required");
	return { prdPath };
}

function deriveFeatureName(prdPath) {
	const basename = path.basename(prdPath, path.extname(prdPath));
	if (basename.startsWith("prd-")) {
		return basename.slice(4) || null;
	}
	return basename || null;
}

function normalizeWhitespace(value) {
	return value.replace(/\s+/gu, " ").trim();
}

function buildNotFoundResult() {
	return {
		found: false,
		featureName: null,
		userStories: [],
		count: 0,
	};
}

function main() {
	const { prdPath } = parseArgs(process.argv);
	if (!fs.existsSync(prdPath)) {
		process.stdout.write(`${JSON.stringify(buildNotFoundResult(), null, 2)}\n`);
		process.exit(0);
	}
	let content;
	try {
		content = fs.readFileSync(prdPath, "utf8");
	} catch (error) {
		process.stderr.write(`Error reading PRD: ${error.message}\n`);
		process.exit(1);
	}
	const storyPattern =
		/^\s*(?:[-*]\s+)?Como\s+(.+?),\s*eu quero\s+(.+?)\s+para que\s+(.+)\s*$/iu;
	const userStories = [];
	content.split(/\r?\n/u).forEach((line) => {
		const match = line.match(storyPattern);
		if (!match) return;
		const role = normalizeWhitespace(match[1]);
		const want = normalizeWhitespace(match[2]);
		const benefit = normalizeWhitespace(match[3]);
		userStories.push({
			id: `US-${String(userStories.length + 1).padStart(3, "0")}`,
			text: normalizeWhitespace(line.replace(/^\s*[-*]\s+/u, "")),
			role,
			want,
			benefit,
			slug: `us-${String(userStories.length + 1).padStart(3, "0")}-${[
				role,
				want,
			]
				.join(" ")
				.toLowerCase()
				.replace(/[^a-z0-9\s]/gu, "")
				.trim()
				.split(/\s+/u)
				.slice(0, 5)
				.join("-")}`,
		});
	});
	const result = {
		found: true,
		featureName: deriveFeatureName(prdPath),
		userStories,
		count: userStories.length,
	};
	process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	process.exit(0);
}

main();
