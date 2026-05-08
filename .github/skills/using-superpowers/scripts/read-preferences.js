#!/usr/bin/env node
/**
 * read-preferences.js — Read .superpowers/preferences.yml from the repository root.
 *
 * Usage:
 *   node scripts/read-preferences.js [--repo-root <path>]
 *
 * Root resolution (in order):
 *   1. --repo-root flag
 *   2. git rev-parse --show-toplevel (git root of cwd)
 *   3. If not in a git repo → return {found: false, repo_not_found: true}
 *
 * Exit codes:
 *   0 — success (including "file not found" or "not a git repo")
 *   1 — usage error or unrecoverable runtime failure
 *
 * Output (stdout): JSON
 * Diagnostics (stderr): warnings only
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ─── CLI ─────────────────────────────────────────────────────────────────────

const HELP = `
read-preferences.js — Read .superpowers/preferences.yml from the repository root.

Usage:
  node scripts/read-preferences.js [--repo-root <path>]

Options:
  --repo-root <path>  Explicit path to the repository root (overrides git detection)
  --help              Show this help text and exit 0

Root resolution (in order):
  1. --repo-root flag
  2. git rev-parse --show-toplevel (from current working directory)
  3. If not in a git repo → returns {found: false, repo_not_found: true}

Output (JSON to stdout):
  {
    "found": boolean,           // true if .superpowers/preferences.yml exists
    "repo_not_found": boolean,  // true if no git root and no --repo-root given
    "malformed": boolean,       // true if file exists but could not be parsed
    "preferencesPath": string,  // absolute path checked
    "preferences": {            // merged: file values + defaults
      "workflow": {
        "auto_commit": boolean,              // default: false
        "confirm_destructive_actions": boolean // default: true
      },
      "communication": {
        "language": string                   // default: "en"
      },
      "copilot": {
        "rubber_duck": boolean               // default: false
      }
    }
  }

Exit codes:
  0  success
  1  usage error or unrecoverable failure
`.trimStart();

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

let repoRoot = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo-root' && args[i + 1]) {
    repoRoot = path.resolve(args[++i]);
  }
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  workflow: {
    auto_commit: true,
    confirm_destructive_actions: true,
  },
  communication: {
    language: 'pt-BR',
  },
  copilot: {
    rubber_duck: false,
  },
};

function deepMerge(defaults, overrides) {
  if (!overrides || typeof overrides !== 'object') return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in overrides) {
      if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
        result[key] = deepMerge(defaults[key], overrides[key]);
      } else {
        result[key] = overrides[key];
      }
    }
  }
  return result;
}

// ─── YAML Parser ─────────────────────────────────────────────────────────────
//
// Handles the specific subset of YAML used in preferences.yml:
//   - Comments (#)
//   - Nested mappings (key: / indent)
//   - Scalar values: strings, booleans (true/false)
//   - No arrays, no multi-line strings
//
// Returns null if the file appears to be structurally malformed.

function parseYaml(content) {
  const lines = content.split('\n');
  const root = {};
  let currentSection = null;
  let malformed = false;

  for (const rawLine of lines) {
    // Strip inline comments — but preserve #-in-values like language: pt-BR
    const line = rawLine.replace(/\s+#.*$/, '').trimEnd();
    if (!line.trim()) continue;

    // Top-level section (no leading whitespace, ends with colon, no value)
    const topMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*$/);
    if (topMatch) {
      currentSection = topMatch[1];
      root[currentSection] = {};
      continue;
    }

    // Nested key (leading whitespace)
    const nestedMatch = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (nestedMatch) {
      const key = nestedMatch[2];
      const rawValue = nestedMatch[3].trim();

      // Parse value
      let value;
      if (rawValue === 'true') value = true;
      else if (rawValue === 'false') value = false;
      else if (rawValue === '' || rawValue === 'null' || rawValue === '~') value = null;
      else value = rawValue.replace(/^['"]|['"]$/g, ''); // strip optional quotes

      if (currentSection) {
        root[currentSection][key] = value;
      }
      continue;
    }

    // Top-level key-value pair (no indentation, has value)
    const topKvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s+(.+)$/);
    if (topKvMatch) {
      const key = topKvMatch[1];
      const rawValue = topKvMatch[2].trim();
      let value;
      if (rawValue === 'true') value = true;
      else if (rawValue === 'false') value = false;
      else value = rawValue.replace(/^['"]|['"]$/g, '');
      root[key] = value;
      currentSection = null;
      continue;
    }

    // Anything else that looks structural is a sign of malformed YAML
    // (e.g., lines that start with [ or have unbalanced structure)
    if (line.trim() && !line.trim().startsWith('#')) {
      const suspicious = /^[^a-zA-Z\s]/.test(line.trim()) ||
                         line.includes('[') ||
                         line.includes('{') ||
                         /^\w+\s+\w+/.test(line.trim()); // key without colon
      if (suspicious) {
        malformed = true;
      }
    }
  }

  return { parsed: root, malformed };
}

// ─── Git root detection ───────────────────────────────────────────────────────

function detectGitRoot() {
  try {
    const result = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// Resolve repo root
if (!repoRoot) {
  repoRoot = detectGitRoot();
  if (!repoRoot) {
    // Not in a git repo and no --repo-root given
    const result = {
      found: false,
      repo_not_found: true,
      malformed: false,
      preferencesPath: null,
      preferences: deepMerge(DEFAULTS, {}),
    };
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(0);
  }
}

const prefsPath = path.join(repoRoot, '.superpowers', 'preferences.yml');

// File does not exist — not an error
if (!fs.existsSync(prefsPath)) {
  const result = {
    found: false,
    repo_not_found: false,
    malformed: false,
    preferencesPath: prefsPath,
    preferences: deepMerge(DEFAULTS, {}),
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

// Read and parse the file
let rawContent;
try {
  rawContent = fs.readFileSync(prefsPath, 'utf8');
} catch (err) {
  process.stderr.write(`Error reading preferences file: ${err.message}\n`);
  process.exit(1);
}

const { parsed, malformed } = parseYaml(rawContent);

if (malformed) {
  process.stderr.write(`Warning: preferences.yml appears malformed — using defaults for missing values\n`);
}

const merged = deepMerge(DEFAULTS, parsed);

const result = {
  found: true,
  repo_not_found: false,
  malformed,
  preferencesPath: prefsPath,
  preferences: merged,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(0);
