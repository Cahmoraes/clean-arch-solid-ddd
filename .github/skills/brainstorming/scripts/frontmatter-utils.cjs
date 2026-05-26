#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const HELP = `
frontmatter-utils.js — Read or update markdown YAML frontmatter.

Usage:
  node scripts/frontmatter-utils.cjs --file <path> --get-key <key>
  node scripts/frontmatter-utils.cjs --file <path> --set-key <key> --set-value <value>

Options:
  --file <path>         Markdown file path
  --get-key <key>       Read a frontmatter key
  --set-key <key>       Write a frontmatter key
  --set-value <value>   Value to write with --set-key
  --help                Show usage and exit 0
`.trimStart();

function usage(message) {
  process.stderr.write(`Error: ${message}\n\nRun with --help for usage.\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(`${HELP}\n`);
    process.exit(0);
  }

  const options = {
    filePath: null,
    getKey: null,
    setKey: null,
    setValue: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--file') {
      if (!args[index + 1]) usage('--file <path> is required');
      options.filePath = path.resolve(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--get-key') {
      if (!args[index + 1]) usage('--get-key <key> is required');
      options.getKey = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--set-key') {
      if (!args[index + 1]) usage('--set-key <key> is required');
      options.setKey = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--set-value') {
      if (!args[index + 1]) usage('--set-value <value> is required');
      options.setValue = args[index + 1];
      index += 1;
      continue;
    }
    usage(`Unknown argument: ${arg}`);
  }

  if (!options.filePath) usage('--file <path> is required');
  const hasGet = options.getKey !== null;
  const hasSet = options.setKey !== null || options.setValue !== null;
  if (!hasGet && !hasSet) usage('Choose either --get-key or --set-key/--set-value');
  if (hasGet && hasSet) usage('Use either --get-key or --set-key/--set-value, not both');
  if (options.setKey !== null && options.setValue === null) usage('--set-value <value> is required with --set-key');
  if (options.setKey === null && options.setValue !== null) usage('--set-key <key> is required with --set-value');
  return options;
}

function parseScalar(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === '~' || trimmed === '') return null;
  if (/^-?\d+(?:\.\d+)?$/u.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function serializeScalar(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (/^[A-Za-z0-9._/-]+$/u.test(value)) return value;
  return JSON.stringify(value);
}

function parseFrontmatter(content) {
  const normalizedContent = content.replace(/\r\n/gu, '\n');
  if (!normalizedContent.startsWith('---\n') && normalizedContent !== '---') {
    return {
      hasFrontmatter: false,
      body: normalizedContent,
      entries: [],
      values: {},
    };
  }

  const lines = normalizedContent.split(/\n/u);
  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) {
    throw new Error('Malformed frontmatter: missing closing delimiter.');
  }

  const entries = [];
  const values = {};
  const rawFrontmatterLines = lines.slice(1, closingIndex);

  rawFrontmatterLines.forEach((line, index) => {
    if (!line.trim()) return;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/u);
    if (!match) {
      throw new Error(`Malformed frontmatter at line ${index + 2}.`);
    }
    const key = match[1];
    const rawValue = match[2].trim();
    const value = parseScalar(rawValue);
    entries.push({ key, rawValue, value });
    values[key] = value;
  });

  return {
    hasFrontmatter: true,
    body: lines.slice(closingIndex + 1).join('\n'),
    entries,
    values,
  };
}

function buildGetResult(filePath, hasFrontmatter, key, entry) {
  if (!entry) {
    return {
      found: false,
      hasFrontmatter,
      key,
      value: null,
      rawValue: null,
      filePath,
    };
  }
  return {
    found: true,
    hasFrontmatter,
    key,
    value: entry.value,
    rawValue: entry.rawValue,
    filePath,
  };
}

function writeFrontmatter(filePath, content, setKey, setValue) {
  const parsed = parseFrontmatter(content);
  const entries = parsed.entries.map((entry) => ({ ...entry }));
  const existingEntry = entries.find((entry) => entry.key === setKey);
  const serializedValue = serializeScalar(setValue);

  if (existingEntry) {
    existingEntry.rawValue = serializedValue;
    existingEntry.value = setValue;
  } else {
    entries.push({ key: setKey, rawValue: serializedValue, value: setValue });
  }

  const frontmatterBlock = ['---', ...entries.map((entry) => `${entry.key}: ${entry.rawValue}`), '---'].join('\n');
  const normalizedBody = parsed.body.replace(/^\n*/u, '');
  const nextContent = normalizedBody ? `${frontmatterBlock}\n\n${normalizedBody}` : `${frontmatterBlock}\n`;
  fs.writeFileSync(filePath, nextContent, 'utf8');
}

function main() {
  const options = parseArgs(process.argv);
  const { filePath, getKey, setKey, setValue } = options;

  if (getKey !== null && !fs.existsSync(filePath)) {
    const result = {
      found: false,
      hasFrontmatter: false,
      key: getKey,
      value: null,
      rawValue: null,
      filePath,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(0);
  }

  if (setKey !== null && !fs.existsSync(filePath)) {
    process.stderr.write(`Error: file does not exist: ${filePath}\n`);
    process.exit(1);
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    process.stderr.write(`Error reading file: ${error.message}\n`);
    process.exit(1);
  }

  if (getKey !== null) {
    try {
      const parsed = parseFrontmatter(content);
      const entry = parsed.entries.find((currentEntry) => currentEntry.key === getKey) || null;
      const result = buildGetResult(filePath, parsed.hasFrontmatter, getKey, entry);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(0);
    } catch (error) {
      process.stderr.write(`Error parsing frontmatter: ${error.message}\n`);
      process.exit(1);
    }
  }

  const parsedSetValue = parseScalar(setValue);
  try {
    writeFrontmatter(filePath, content, setKey, parsedSetValue);
  } catch (error) {
    process.stderr.write(`Error parsing frontmatter: ${error.message}\n`);
    process.exit(1);
  }

  const result = {
    success: true,
    key: setKey,
    value: parsedSetValue,
    message: `Updated frontmatter key ${setKey}.`,
    filePath,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseFrontmatter,
  parseScalar,
  serializeScalar,
};
