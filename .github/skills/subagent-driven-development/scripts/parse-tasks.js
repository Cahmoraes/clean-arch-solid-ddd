#!/usr/bin/env node
/**
 * parse-tasks.js — Parse a superpowers tasks index and individual task files.
 *
 * Usage:
 *   node scripts/parse-tasks.js --tasks-index <path>
 *
 * Exit codes:
 *   0 — success (including "file not found" — that is not an error)
 *   1 — usage error or runtime failure (bad args, unreadable index)
 *
 * Output (stdout): JSON
 * Diagnostics (stderr): warnings only
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ─── CLI ─────────────────────────────────────────────────────────────────────

const HELP = `
parse-tasks.js — Parse a superpowers tasks index and individual task files.

Usage:
  node scripts/parse-tasks.js --tasks-index <path>

Options:
  --tasks-index <path>  Path to the tasks index file (tasks-<feature>.md)
  --help                Show this help text and exit 0

Output (JSON to stdout):
  {
    "found": boolean,         // false if file does not exist
    "allDone": boolean,       // true when all tasks are [x] and Status: DONE
    "completed": Task[],      // tasks with [x] in index
    "pending": Task[],        // tasks with [ ] in index AND Status: PENDING
    "inProgress": Task[],     // tasks with [ ] in index AND Status: IN_PROGRESS
    "mismatches": Mismatch[], // index and task-file status disagree
    "indexPath": string
  }

Task object:
  { "number": number, "title": string, "file": string,
    "indexDone": boolean, "fileStatus": string|null, "fileReadError": string|null }

Mismatch object:
  { "file": string, "indexDone": boolean, "fileStatus": string, "description": string }

Exit codes:
  0  success (including "file not found")
  1  usage error or unrecoverable runtime failure
`.trimStart();

function usage(msg) {
	process.stderr.write(`Error: ${msg}\n\nRun with --help for usage.\n`);
	process.exit(1);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
	process.stdout.write(HELP);
	process.exit(0);
}

let indexPath = null;
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--tasks-index" && args[i + 1]) {
		indexPath = args[++i];
	}
}

if (!indexPath) {
	usage("--tasks-index <path> is required");
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Parse task lines from the index.
 * Matches: `- [x] N. Title → \`file.md\`` (various formats)
 */
function parseIndexTasks(content) {
	const tasks = [];
	// Match lines like:  - [x] 3. Title [RF-003] → `task-03.md`
	// or:                - [ ] 3. Title → `task-03.md`
	const lineRe =
		/^-\s+\[([ xX])\]\s+(\d+)\.\s+(.+?)\s*(?:→|->)\s*`([^`]+\.md)`/;
	for (const line of content.split("\n")) {
		const m = line.match(lineRe);
		if (!m) continue;
		const done = m[1].toLowerCase() === "x";
		tasks.push({
			number: parseInt(m[2], 10),
			title: m[3].trim(),
			file: m[4].trim(),
			indexDone: done,
		});
	}
	return tasks;
}

/**
 * Extract **Status:** value from a task file.
 * Returns one of: DONE | IN_PROGRESS | PENDING | null (not found)
 */
function parseTaskFileStatus(content) {
	const m = content.match(/^\*\*Status:\*\*\s*(\S+)/m);
	return m ? m[1].trim().toUpperCase() : null;
}

/**
 * Detect mismatches between the index [x]/[ ] and the task file **Status:**.
 *
 * A mismatch is:
 *   - index says [x]  but file Status is NOT DONE
 *   - index says [ ]  but file Status is DONE
 */
function detectMismatch(task) {
	const { indexDone, fileStatus } = task;
	if (fileStatus === null) return null; // can't detect — no status in file

	const fileDone = fileStatus === "DONE";
	if (indexDone && !fileDone) {
		return {
			file: task.file,
			indexDone: true,
			fileStatus,
			description: `Index marks [x] but task file has Status: ${fileStatus}`,
		};
	}
	if (!indexDone && fileDone) {
		return {
			file: task.file,
			indexDone: false,
			fileStatus,
			description: `Index marks [ ] but task file has Status: DONE`,
		};
	}
	return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const absIndexPath = path.resolve(indexPath);

// File not found is NOT an error — return found: false with exit 0
if (!fs.existsSync(absIndexPath)) {
	process.stdout.write(
		JSON.stringify(
			{
				found: false,
				allDone: false,
				completed: [],
				pending: [],
				inProgress: [],
				mismatches: [],
				indexPath: absIndexPath,
			},
			null,
			2,
		) + "\n",
	);
	process.exit(0);
}

let indexContent;
try {
	indexContent = fs.readFileSync(absIndexPath, "utf8");
} catch (err) {
	process.stderr.write(`Error reading tasks index: ${err.message}\n`);
	process.exit(1);
}

const indexDir = path.dirname(absIndexPath);
const rawTasks = parseIndexTasks(indexContent);

if (rawTasks.length === 0) {
	process.stderr.write(`Warning: no task lines found in ${absIndexPath}\n`);
}

// Enrich with task file data
const enriched = rawTasks.map((task) => {
	const taskFilePath = path.join(indexDir, task.file);
	let fileStatus = null;
	let fileReadError = null;

	if (fs.existsSync(taskFilePath)) {
		try {
			const content = fs.readFileSync(taskFilePath, "utf8");
			fileStatus = parseTaskFileStatus(content);
			if (fileStatus === null) {
				process.stderr.write(`Warning: no **Status:** field in ${task.file}\n`);
			}
		} catch (err) {
			fileReadError = err.message;
			process.stderr.write(
				`Warning: could not read ${task.file}: ${err.message}\n`,
			);
		}
	} else {
		fileReadError = `File not found: ${taskFilePath}`;
		process.stderr.write(
			`Warning: referenced task file not found: ${task.file}\n`,
		);
	}

	return { ...task, fileStatus, fileReadError };
});

// Classify tasks
const completed = enriched.filter((t) => t.indexDone);
const incomplete = enriched.filter((t) => !t.indexDone);
const inProgress = incomplete.filter((t) => t.fileStatus === "IN_PROGRESS");
const pending = incomplete.filter((t) => t.fileStatus !== "IN_PROGRESS");

// Detect mismatches
const mismatches = enriched.reduce((acc, task) => {
	const m = detectMismatch(task);
	if (m) acc.push(m);
	return acc;
}, []);

const allDone =
	enriched.length > 0 &&
	enriched.every((t) => t.indexDone && t.fileStatus === "DONE");

const result = {
	found: true,
	allDone,
	completed,
	pending,
	inProgress,
	mismatches,
	indexPath: absIndexPath,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(0);
