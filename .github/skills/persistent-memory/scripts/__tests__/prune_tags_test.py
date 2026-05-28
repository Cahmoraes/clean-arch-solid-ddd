#!/usr/bin/env python3
"""Regression test for `pmem prune --tags` (selective per-feature prune).

The GateResync design (memory-resync.md) prunes a single feature's stale entries
with `pmem prune --source "artifact-sync" --tags "<slug>"`. This capability must
exist so the sync does not need a destructive global prune.

Run with: python3 .github/skills/persistent-memory/scripts/__tests__/prune_tags_test.py

Seeds notes via direct SQLite (no embedding model needed) and exercises the real
CLI through subprocess so argument parsing is covered end to end.
"""

from __future__ import annotations

import hashlib
import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "memory.py"


def content_hash(content: str) -> str:
    normalized = " ".join(content.strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def seed(db_path: Path, rows: list[tuple[str, str, str]]) -> None:
    """rows = list of (content, tags, source)."""
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            source TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            content_hash TEXT NOT NULL UNIQUE,
            hits INTEGER NOT NULL DEFAULT 0,
            last_seen_at TEXT
        )
        """
    )
    for content, tags, source in rows:
        conn.execute(
            "INSERT INTO notes(created_at, source, tags, content, content_hash) VALUES (?,?,?,?,?)",
            ("2026-01-01T00:00:00+00:00", source, tags, content, content_hash(content)),
        )
    conn.commit()
    conn.close()


def remaining_tags(db_path: Path) -> set[str]:
    conn = sqlite3.connect(db_path)
    rows = conn.execute("SELECT tags FROM notes").fetchall()
    conn.close()
    return {r[0] for r in rows}


def run_prune(root: Path, *args: str) -> subprocess.CompletedProcess:
    env = {**os.environ, "PMEM_ROOT": str(root)}
    return subprocess.run(
        [sys.executable, str(SCRIPT), "prune", *args],
        env=env,
        capture_output=True,
        text=True,
    )


def test_prune_by_tag_isolates_one_feature() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        db = root / ".memory" / "memory.db"
        db.parent.mkdir(parents=True, exist_ok=True)
        seed(
            db,
            [
                ("foo spec entry", "artifact-sync,foo,spec", "artifact-sync"),
                ("foo prd entry", "artifact-sync,foo,prd", "artifact-sync"),
                ("bar spec entry", "artifact-sync,bar,spec", "artifact-sync"),
                ("assistant note", "planning", "assistant"),
            ],
        )
        proc = run_prune(root, "--source", "artifact-sync", "--tags", "foo")
        assert proc.returncode == 0, f"prune --tags failed: {proc.stderr}"
        tags = remaining_tags(db)
        assert "artifact-sync,bar,spec" in tags, "bar (other feature) must survive"
        assert "planning" in tags, "assistant note (other source) must survive"
        assert "artifact-sync,foo,spec" not in tags, "foo entries must be pruned"
        assert "artifact-sync,foo,prd" not in tags, "foo entries must be pruned"


def test_prune_without_tags_still_clears_whole_source() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        db = root / ".memory" / "memory.db"
        db.parent.mkdir(parents=True, exist_ok=True)
        seed(
            db,
            [
                ("foo spec entry", "artifact-sync,foo,spec", "artifact-sync"),
                ("bar spec entry", "artifact-sync,bar,spec", "artifact-sync"),
                ("assistant note", "planning", "assistant"),
            ],
        )
        proc = run_prune(root, "--source", "artifact-sync")
        assert proc.returncode == 0, f"prune failed: {proc.stderr}"
        tags = remaining_tags(db)
        assert tags == {"planning"}, f"only the assistant note should remain, got {tags}"


def main() -> int:
    failures = 0
    for fn in (test_prune_by_tag_isolates_one_feature, test_prune_without_tags_still_clears_whole_source):
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except AssertionError as exc:
            failures += 1
            print(f"FAIL {fn.__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print(f"ERROR {fn.__name__}: {type(exc).__name__}: {exc}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
