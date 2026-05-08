#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HELP = `
find-feature-files.js — Locate PRD, spec, tasks index, and QA report files for a feature.

Usage:
  node scripts/find-feature-files.js --feature-name <name> [--repo-root <path>] [--base-dir <path>]

Options:
  --feature-name <name>  Feature slug/name to resolve
  --repo-root <path>     Repository root override
  --base-dir <path>      Base directory override (relative to repo root unless absolute)
  --help                 Show usage and exit 0
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
    featureName: null,
    repoRoot: null,
    baseDir: null,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--feature-name') {
      if (!args[index + 1]) usage('--feature-name <name> is required');
      options.featureName = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--repo-root') {
      if (!args[index + 1]) usage('--repo-root <path> is required');
      options.repoRoot = path.resolve(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--base-dir') {
      if (!args[index + 1]) usage('--base-dir <path> is required');
      options.baseDir = args[index + 1];
      index += 1;
      continue;
    }
    usage(`Unknown argument: ${arg}`);
  }
  if (!options.featureName) usage('--feature-name <name> is required');
  return options;
}

function detectGitRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function buildFileEntry(candidatePath) {
  if (fs.existsSync(candidatePath)) {
    return { found: true, path: candidatePath };
  }
  return { found: false, path: null };
}

function main() {
  const { featureName, repoRoot: providedRepoRoot, baseDir: baseDirArgument } = parseArgs(process.argv);
  const repoRoot = providedRepoRoot || detectGitRoot();
  if (!repoRoot) {
    process.stderr.write('Error: Unable to resolve repository root. Use --repo-root <path>.\n');
    process.exit(1);
  }
  const baseDir = baseDirArgument
    ? (path.isAbsolute(baseDirArgument) ? baseDirArgument : path.resolve(repoRoot, baseDirArgument))
    : path.join(repoRoot, 'docs', 'superpowers');
  const featureDir = path.join(baseDir, featureName);
  const result = {
    featureName,
    prd: buildFileEntry(path.join(featureDir, 'prd', `prd-${featureName}.md`)),
    spec: buildFileEntry(path.join(featureDir, 'specs', `${featureName}-design.md`)),
    tasksIndex: buildFileEntry(path.join(featureDir, 'plans', `tasks-${featureName}.md`)),
    qaReport: buildFileEntry(path.join(featureDir, 'qa', `qa-report-${featureName}.md`)),
    baseDir,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

main();
