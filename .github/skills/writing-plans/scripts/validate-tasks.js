#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const HELP = `
validate-tasks.js — Validate a writing-plans tasks index file.

Usage:
  node scripts/validate-tasks.js --tasks-index <path>

Options:
  --tasks-index <path>  Path to tasks index markdown file
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
  let tasksIndexPath = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--tasks-index') {
      if (!args[index + 1]) usage('--tasks-index <path> is required');
      tasksIndexPath = args[index + 1];
      index += 1;
      continue;
    }
    usage(`Unknown argument: ${arg}`);
  }
  if (!tasksIndexPath) usage('--tasks-index <path> is required');
  return { tasksIndexPath: path.resolve(tasksIndexPath) };
}

function buildNotFoundResult(tasksIndexPath) {
  return {
    found: false,
    valid: false,
    errors: [],
    warnings: [],
    taskCount: 0,
    taskNumbers: [],
    tasksIndexPath,
  };
}

function normalizeTitle(title) {
  return title.replace(/\s+\[[^\]]+\]\s*$/u, '').trim();
}

function validateTasksIndex(content, tasksIndexPath) {
  const lines = content.split(/\r?\n/u);
  const errors = [];
  const warnings = [];
  const taskNumbers = [];
  const seenNumbers = new Set();
  const parsedTasks = [];
  const taskLinePattern = /^-\s+\[([ xX])\]\s+(\d+)\.\s+(.+?)\s*(?:→|->)\s*`([^`]+)`\s*$/u;
  let expectedNumber = 1;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const match = line.match(taskLinePattern);
    if (match) {
      const taskNumber = Number.parseInt(match[2], 10);
      const rawTitle = match[3].trim();
      const taskFile = match[4].trim();
      const normalizedTitle = normalizeTitle(rawTitle);
      parsedTasks.push({ lineNumber, taskNumber, rawTitle, normalizedTitle, taskFile });
      taskNumbers.push(taskNumber);
      if (seenNumbers.has(taskNumber)) {
        errors.push({ line: lineNumber, message: `Task number ${taskNumber} is duplicated.` });
      } else {
        seenNumbers.add(taskNumber);
      }
      if (taskNumber !== expectedNumber) {
        errors.push({ line: lineNumber, message: `Task numbers must be sequential starting at 1. Expected ${expectedNumber}, found ${taskNumber}.` });
      } else {
        expectedNumber += 1;
      }
      if (!/\.md$/iu.test(taskFile)) {
        errors.push({ line: lineNumber, message: `Task reference must point to a .md file. Found: ${taskFile}` });
      }
      if (normalizedTitle.length < 5) {
        warnings.push({ line: lineNumber, message: 'Task title is too short (minimum 5 characters).' });
      }
      if (normalizedTitle.length > 120) {
        warnings.push({ line: lineNumber, message: 'Task title is too long (maximum 120 characters).' });
      }
      return;
    }
    if (/^-\s+\[[ xX]\]/u.test(line)) {
      errors.push({ line: lineNumber, message: 'Task line format is invalid.' });
    }
  });

  if (parsedTasks.length === 0) {
    errors.push({ line: 0, message: 'Tasks index must contain at least one task line.' });
  }

  warnings.forEach((warning) => {
    process.stderr.write(`Warning:${warning.line > 0 ? ` line ${warning.line}` : ''}: ${warning.message}\n`);
  });

  return {
    found: true,
    valid: errors.length === 0,
    errors,
    warnings,
    taskCount: parsedTasks.length,
    taskNumbers,
    tasksIndexPath,
  };
}

function main() {
  const { tasksIndexPath } = parseArgs(process.argv);
  if (!fs.existsSync(tasksIndexPath)) {
    process.stdout.write(`${JSON.stringify(buildNotFoundResult(tasksIndexPath), null, 2)}\n`);
    process.exit(0);
  }
  let content;
  try {
    content = fs.readFileSync(tasksIndexPath, 'utf8');
  } catch (error) {
    process.stderr.write(`Error reading tasks index: ${error.message}\n`);
    process.exit(1);
  }
  const result = validateTasksIndex(content, tasksIndexPath);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

main();
