#!/usr/bin/env node
'use strict';

/**
 * Outputs the current host datetime as an ISO 8601 string with local timezone offset.
 * Format: YYYY-MM-DDTHH:MM:SS±HH:MM  (e.g. "2026-05-15T09:56:00-03:00")
 *
 * Use this script instead of relying on the model's context datetime, which is
 * set at session start and drifts as the session progresses.
 *
 * Usage:
 *   node scripts/get-current-datetime.js
 *   node ../brainstorming/scripts/get-current-datetime.js
 */

function pad(n) {
  return String(n).padStart(2, '0');
}

function toLocalISOString(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  // getTimezoneOffset() returns minutes *behind* UTC (negative for east of UTC).
  // Negate it to get the actual offset from UTC.
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

process.stdout.write(`${toLocalISOString(new Date())}\n`);
