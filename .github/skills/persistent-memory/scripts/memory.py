#!/usr/bin/env python3
"""Lightweight persistent memory CLI for this workspace.

The system uses a local SQLite database (`.memory/memory.db`) as the single
source of truth. Search uses lexical retrieval plus semantic retrieval.
"""

from __future__ import annotations

import argparse
import hashlib
import math
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np

try:
    import sqlite_vec  # type: ignore
except Exception:
    sqlite_vec = None

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:
    SentenceTransformer = None


def _detect_workspace_root() -> Path:
    """Find the workspace root by walking upward from this script file."""
    here = Path(__file__).resolve()
    for parent in [here.parent] + list(here.parents):
        if (parent / ".git").exists() or (parent / "AGENTS.md").exists():
            return parent
    return here.parents[4]


ROOT = _detect_workspace_root()
DB_PATH = ROOT / ".memory" / "memory.db"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

WEIGHT_LEXICAL = 0.70
WEIGHT_SEMANTIC = 0.30
WEIGHT_RECENCY = 0.20
WEIGHT_TAG = 0.10

_EMBEDDER: Any = None
_SQLITE_VEC_STATUS: str | None = None
_SEMANTIC_BACKEND_NOTICE_SHOWN = False


def utc_now() -> str:
    """Return the current UTC timestamp in a compact ISO format."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect() -> sqlite3.Connection:
    """Open the SQLite database connection."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    """Return True when a SQLite table or virtual table exists."""
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE name = ? AND type IN ('table','view')",
        (name,),
    ).fetchone()
    return row is not None


def _init_sqlite_vec(conn: sqlite3.Connection) -> bool:
    """Attempt to initialize sqlite-vec and return availability."""
    global _SQLITE_VEC_STATUS
    if _SQLITE_VEC_STATUS is not None:
        return _SQLITE_VEC_STATUS == "sqlite-vec"

    if sqlite_vec is None:
        _SQLITE_VEC_STATUS = "python-cosine-fallback"
        return False
    try:
        sqlite_vec.load(conn)
        _SQLITE_VEC_STATUS = "sqlite-vec"
        return True
    except Exception:
        _SQLITE_VEC_STATUS = "python-cosine-fallback"
        return False


def semantic_backend(conn: sqlite3.Connection) -> str:
    """Return active semantic backend label."""
    _init_sqlite_vec(conn)
    return _SQLITE_VEC_STATUS or "python-cosine-fallback"


def init_db(conn: sqlite3.Connection) -> bool:
    """Create schema and return whether FTS5 indexing is available."""
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
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS memory_embeddings (
            note_id INTEGER PRIMARY KEY,
            model TEXT NOT NULL,
            dim INTEGER NOT NULL,
            embedding BLOB NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at DESC)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS notes_last_seen_at_idx ON notes(last_seen_at DESC)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS memory_embeddings_updated_at_idx ON memory_embeddings(updated_at DESC)"
    )

    fts_available = True
    try:
        conn.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts
            USING fts5(
                content,
                tags,
                source,
                content='notes',
                content_rowid='id',
                tokenize='porter unicode61'
            )
            """
        )
    except sqlite3.OperationalError:
        fts_available = False

    if fts_available:
        conn.executescript(
            """
            CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                INSERT INTO notes_fts(rowid, content, tags, source)
                VALUES (new.id, new.content, new.tags, new.source);
            END;

            CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                INSERT INTO notes_fts(notes_fts, rowid, content, tags, source)
                VALUES ('delete', old.id, old.content, old.tags, old.source);
            END;

            CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                INSERT INTO notes_fts(notes_fts, rowid, content, tags, source)
                VALUES ('delete', old.id, old.content, old.tags, old.source);
                INSERT INTO notes_fts(rowid, content, tags, source)
                VALUES (new.id, new.content, new.tags, new.source);
            END;
            """
        )
        if _table_exists(conn, "notes_fts"):
            conn.execute("INSERT INTO notes_fts(notes_fts) VALUES ('rebuild')")

    conn.commit()
    return fts_available


def _normalize_tags(tags: str) -> str:
    """Normalize tags into a deduplicated comma-separated string."""
    parts = [p.strip().lower() for p in tags.split(",") if p.strip()]
    seen: set[str] = set()
    ordered: list[str] = []
    for part in parts:
        if part not in seen:
            seen.add(part)
            ordered.append(part)
    return ",".join(ordered)


def _content_hash(content: str) -> str:
    """Compute a stable hash for note deduplication."""
    normalized = " ".join(content.strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _load_embedder() -> Any:
    """Load and cache the sentence transformer model."""
    global _EMBEDDER
    if _EMBEDDER is not None:
        return _EMBEDDER
    if SentenceTransformer is None:
        raise RuntimeError(
            "sentence-transformers is not installed. Install with: pip install sentence-transformers"
        )
    _EMBEDDER = SentenceTransformer(EMBED_MODEL)
    return _EMBEDDER


def _embed_text(text: str) -> np.ndarray:
    """Embed text and return a normalized float32 vector."""
    model = _load_embedder()
    vec = model.encode(text, normalize_embeddings=True)
    arr = np.asarray(vec, dtype=np.float32)
    norm = float(np.linalg.norm(arr))
    if norm > 0:
        arr = arr / norm
    return arr


def _upsert_embedding(conn: sqlite3.Connection, note_id: int, content: str) -> None:
    """Generate and upsert semantic embedding for a note."""
    vec = _embed_text(content)
    conn.execute(
        """
        INSERT INTO memory_embeddings(note_id, model, dim, embedding, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(note_id) DO UPDATE SET
            model = excluded.model,
            dim = excluded.dim,
            embedding = excluded.embedding,
            updated_at = excluded.updated_at
        """,
        (note_id, EMBED_MODEL, int(vec.shape[0]), vec.tobytes(), utc_now()),
    )


def add_note(
    conn: sqlite3.Connection,
    *,
    content: str,
    tags: str,
    source: str,
) -> tuple[int | None, bool]:
    """Insert a note into the memory database."""
    content = content.strip()
    if not content:
        raise ValueError("content cannot be empty")

    tags = _normalize_tags(tags)
    created_at = utc_now()
    digest = _content_hash(content)
    cursor = conn.execute(
        """
        INSERT OR IGNORE INTO notes(created_at, source, tags, content, content_hash)
        VALUES (?, ?, ?, ?, ?)
        """,
        (created_at, source.strip() or "manual", tags, content, digest),
    )

    inserted = cursor.rowcount > 0
    note_id: int | None = None
    if inserted:
        row = conn.execute("SELECT id FROM notes WHERE content_hash = ?", (digest,)).fetchone()
        note_id = int(row["id"]) if row else None
        if note_id is not None:
            _upsert_embedding(conn, note_id, content)
    conn.commit()
    return note_id, inserted


def _format_row(row: sqlite3.Row) -> str:
    """Format a row for CLI output."""
    tags = f" [{row['tags']}]" if row["tags"] else ""
    return f"{row['id']:>4} | {row['created_at']} | {row['source']}{tags}\n      {row['content']}"


def _format_search_row(row: sqlite3.Row, score: float) -> str:
    """Format a search row with diagnostics."""
    base = _format_row(row)
    last_seen = row["last_seen_at"] or "never"
    hits = int(row["hits"] or 0)
    return f"{base}\n      hits={hits} last_seen={last_seen} score={score:.3f}"


def _query_tokens(query: str) -> set[str]:
    """Tokenize query text into lowercase words."""
    return {token for token in re.findall(r"[a-z0-9]+", query.lower()) if token}


def _fts_query_from_text(query: str) -> str:
    """Build a safe FTS5 query."""
    tokens = sorted(_query_tokens(query))
    if not tokens:
        return ""
    escaped = [token.replace('"', '""') for token in tokens]
    return " OR ".join(f'"{token}"' for token in escaped)


def _build_like_predicate(query: str) -> tuple[str, list[str]]:
    """Build broad LIKE predicate from query tokens + raw query."""
    tokens = sorted(_query_tokens(query))
    terms: list[str] = []
    if query.strip():
        terms.append(query.strip())
    for token in tokens:
        if token not in terms:
            terms.append(token)
    if not terms:
        terms = [query]

    clauses: list[str] = []
    params: list[str] = []
    for term in terms:
        clauses.append("(content LIKE ? OR tags LIKE ? OR source LIKE ?)")
        pattern = f"%{term}%"
        params.extend([pattern, pattern, pattern])
    return " OR ".join(clauses), params


def _tags_set(tags: str) -> set[str]:
    """Split tag CSV into normalized set."""
    return {tag.strip().lower() for tag in tags.split(",") if tag.strip()}


def _iso_age_days(iso_value: str | None, now_ts: datetime) -> float:
    """Return age in days for ISO timestamp; very large when missing."""
    if not iso_value:
        return 3650.0
    try:
        past = datetime.fromisoformat(iso_value)
    except ValueError:
        return 3650.0
    delta = now_ts - past
    return max(0.0, delta.total_seconds() / 86400.0)


def _recency_component(row: sqlite3.Row, now_ts: datetime) -> float:
    """Compute recency score from creation and last_seen timestamps."""
    created_days = _iso_age_days(row["created_at"], now_ts)
    seen_days = _iso_age_days(row["last_seen_at"], now_ts)
    created_score = math.exp(-created_days / 14.0)
    seen_score = math.exp(-seen_days / 7.0)
    return max(created_score, seen_score)


def _tag_component(query: str, tags: str) -> float:
    """Compute tag overlap score."""
    q_tokens = _query_tokens(query)
    if not q_tokens:
        return 0.0
    t_tokens = _tags_set(tags)
    if not t_tokens:
        return 0.0
    overlap = len(q_tokens.intersection(t_tokens))
    return overlap / len(q_tokens)


def _relevance_component_from_bm25(bm25_score: float | None) -> float:
    """Map bm25 score to [0,1], where larger means more relevant."""
    if bm25_score is None:
        return 0.0
    return 1.0 / (1.0 + max(0.0, bm25_score))


def _relevance_component_like(query: str, row: sqlite3.Row) -> float:
    """Estimate lexical relevance in LIKE fallback."""
    text = f"{row['content']} {row['tags']} {row['source']}".lower()
    q_tokens = _query_tokens(query)
    if not q_tokens:
        return 0.0
    hits = sum(1 for token in q_tokens if token in text)
    return hits / len(q_tokens)


def _lexical_candidates(
    conn: sqlite3.Connection, query: str, limit: int, fts_available: bool
) -> dict[int, float]:
    """Return note_id -> lexical score map."""
    candidate_limit = max(limit * 5, 30)
    results: dict[int, float] = {}
    fts_query = _fts_query_from_text(query)

    if fts_available and fts_query:
        try:
            rows = conn.execute(
                """
                SELECT n.id, bm25(notes_fts) AS bm25_score
                FROM notes_fts
                JOIN notes n ON n.id = notes_fts.rowid
                WHERE notes_fts MATCH ?
                ORDER BY bm25_score
                LIMIT ?
                """,
                (fts_query, candidate_limit),
            ).fetchall()
            if rows:
                for row in rows:
                    results[int(row["id"])] = _relevance_component_from_bm25(
                        float(row["bm25_score"])
                    )
                return results
        except sqlite3.OperationalError:
            pass

    where_clause, where_params = _build_like_predicate(query)
    rows = conn.execute(
        f"""
        SELECT id, created_at, source, tags, content, hits, last_seen_at
        FROM notes
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT ?
        """,
        [*where_params, candidate_limit],
    ).fetchall()
    for row in rows:
        results[int(row["id"])] = _relevance_component_like(query, row)
    return results


def _semantic_candidates_python(conn: sqlite3.Connection, query: str, limit: int) -> dict[int, float]:
    """Return note_id -> semantic score using Python cosine fallback."""
    q_vec = _embed_text(query)
    rows = conn.execute(
        """
        SELECT note_id, dim, embedding
        FROM memory_embeddings
        WHERE model = ?
        """,
        (EMBED_MODEL,),
    ).fetchall()
    scores: list[tuple[int, float]] = []
    for row in rows:
        note_id = int(row["note_id"])
        dim = int(row["dim"])
        emb = np.frombuffer(row["embedding"], dtype=np.float32, count=dim)
        score = float(np.dot(q_vec, emb))
        scores.append((note_id, score))
    scores.sort(key=lambda item: item[1], reverse=True)
    return {note_id: score for note_id, score in scores[: max(limit * 5, 30)]}


def _semantic_candidates_sqlite_vec(
    conn: sqlite3.Connection, query: str, limit: int
) -> dict[int, float]:
    """Return note_id -> semantic score using sqlite-vec SQL functions."""
    q_vec = _embed_text(query)
    q_blob = q_vec.astype(np.float32).tobytes()
    rows = conn.execute(
        """
        SELECT note_id, (1.0 - vec_distance_cosine(embedding, ?)) AS score
        FROM memory_embeddings
        WHERE model = ?
        ORDER BY vec_distance_cosine(embedding, ?) ASC
        LIMIT ?
        """,
        (q_blob, EMBED_MODEL, q_blob, max(limit * 5, 30)),
    ).fetchall()
    return {int(row["note_id"]): float(row["score"]) for row in rows}


def _semantic_candidates(conn: sqlite3.Connection, query: str, limit: int) -> tuple[dict[int, float], str]:
    """Return semantic candidates and active backend label."""
    global _SEMANTIC_BACKEND_NOTICE_SHOWN, _SQLITE_VEC_STATUS
    backend = semantic_backend(conn)
    if backend == "sqlite-vec":
        try:
            return _semantic_candidates_sqlite_vec(conn, query, limit), "sqlite-vec"
        except Exception:
            _SQLITE_VEC_STATUS = "python-cosine-fallback"
            backend = "python-cosine-fallback"

    if not _SEMANTIC_BACKEND_NOTICE_SHOWN and backend != "sqlite-vec":
        print("semantic_backend_notice=python-cosine-fallback (sqlite-vec unavailable)")
        _SEMANTIC_BACKEND_NOTICE_SHOWN = True
    return _semantic_candidates_python(conn, query, limit), "python-cosine-fallback"


def _mark_recalled(conn: sqlite3.Connection, note_ids: list[int]) -> None:
    """Increment hits and update last_seen_at for recalled notes."""
    if not note_ids:
        return
    seen_at = utc_now()
    conn.executemany(
        """
        UPDATE notes
        SET hits = hits + 1, last_seen_at = ?
        WHERE id = ?
        """,
        [(seen_at, note_id) for note_id in note_ids],
    )
    conn.commit()


def _combined_search(
    conn: sqlite3.Connection, query: str, limit: int, fts_available: bool
) -> tuple[list[tuple[sqlite3.Row, float]], str]:
    """Run hybrid lexical+semantic search and return scored rows + backend."""
    now_ts = datetime.now(timezone.utc)
    lexical = _lexical_candidates(conn, query, limit, fts_available)
    semantic, backend = _semantic_candidates(conn, query, limit)

    note_ids = set(lexical.keys()) | set(semantic.keys())
    if not note_ids:
        return [], backend

    rows = conn.execute(
        f"""
        SELECT id, created_at, source, tags, content, hits, last_seen_at
        FROM notes
        WHERE id IN ({",".join(["?"] * len(note_ids))})
        """,
        list(note_ids),
    ).fetchall()
    rows_by_id = {int(row["id"]): row for row in rows}

    scored: list[tuple[sqlite3.Row, float]] = []
    for note_id in note_ids:
        row = rows_by_id.get(note_id)
        if row is None:
            continue
        lexical_score = lexical.get(note_id, 0.0)
        semantic_score = max(0.0, semantic.get(note_id, 0.0))
        recency = _recency_component(row, now_ts)
        tag_match = _tag_component(query, row["tags"])
        score = (
            WEIGHT_LEXICAL * lexical_score
            + WEIGHT_SEMANTIC * semantic_score
            + WEIGHT_RECENCY * recency
            + WEIGHT_TAG * tag_match
        )
        scored.append((row, score))

    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:limit], backend


def _embedding_coverage(conn: sqlite3.Connection) -> tuple[int, int]:
    """Return (embedded_notes, total_notes)."""
    total_row = conn.execute("SELECT COUNT(*) AS c FROM notes").fetchone()
    embedded_row = conn.execute("SELECT COUNT(*) AS c FROM memory_embeddings").fetchone()
    total = int(total_row["c"]) if total_row else 0
    embedded = int(embedded_row["c"]) if embedded_row else 0
    return embedded, total


def cmd_init(conn: sqlite3.Connection, _: argparse.Namespace) -> None:
    """Handle the init command."""
    fts_available = init_db(conn)
    print(f"initialized: {DB_PATH}")
    print(f"fts5: {'enabled' if fts_available else 'unavailable (LIKE fallback)'}")
    print(f"semantic_backend: {semantic_backend(conn)}")


def cmd_add(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    """Handle the add command."""
    init_db(conn)
    note_id, inserted = add_note(
        conn,
        content=args.content,
        tags=args.tags or "",
        source=args.source or "manual",
    )
    if inserted:
        print(f"added note id={note_id}")
    else:
        print("skipped duplicate note")


def cmd_sync(conn: sqlite3.Connection, _: argparse.Namespace) -> None:
    """Handle sync in database-only mode."""
    init_db(conn)
    embedded, total = _embedding_coverage(conn)
    print("sync complete: database-only mode (no external files to index)")
    print(f"semantic_backend: {semantic_backend(conn)}")
    print(f"embedding_coverage: {embedded}/{total}")


def cmd_cleanup_legacy(conn: sqlite3.Connection, _: argparse.Namespace) -> None:
    """Delete legacy sync rows and related embeddings."""
    init_db(conn)
    rows = conn.execute("SELECT id FROM notes WHERE source LIKE 'sync:%'").fetchall()
    note_ids = [int(row["id"]) for row in rows]
    if note_ids:
        conn.execute(
            f"DELETE FROM memory_embeddings WHERE note_id IN ({','.join(['?'] * len(note_ids))})",
            note_ids,
        )
        conn.execute(
            f"DELETE FROM notes WHERE id IN ({','.join(['?'] * len(note_ids))})",
            note_ids,
        )
    conn.commit()
    print(f"deleted_legacy_notes: {len(note_ids)}")


def cmd_backfill_embeddings(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    """Generate embeddings for notes missing them."""
    init_db(conn)
    limit = max(1, int(args.batch))
    rows = conn.execute(
        """
        SELECT n.id, n.content
        FROM notes n
        LEFT JOIN memory_embeddings e ON e.note_id = n.id
        WHERE e.note_id IS NULL
        ORDER BY n.id ASC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    count = 0
    for row in rows:
        _upsert_embedding(conn, int(row["id"]), str(row["content"]))
        count += 1
    conn.commit()
    print(f"embedded_notes: {count}")


def cmd_prune(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    """Delete notes by source with optional age threshold in days."""
    init_db(conn)
    source = (args.source or "").strip()
    if not source:
        raise ValueError("--source is required")

    params: list[Any] = [source]
    where = "source = ?"
    cutoff = None
    if args.older_than is not None:
        days = max(0, int(args.older_than))
        cutoff = (
            datetime.now(timezone.utc).replace(microsecond=0)
            - timedelta(days=days)
        ).isoformat()
        where += " AND created_at < ?"
        params.append(cutoff)

    rows = conn.execute(
        f"SELECT id FROM notes WHERE {where}",
        params,
    ).fetchall()
    note_ids = [int(row["id"]) for row in rows]
    if note_ids:
        conn.execute(
            f"DELETE FROM memory_embeddings WHERE note_id IN ({','.join(['?'] * len(note_ids))})",
            note_ids,
        )
        conn.execute(
            f"DELETE FROM notes WHERE id IN ({','.join(['?'] * len(note_ids))})",
            note_ids,
        )
    conn.commit()
    print(f"pruned_notes: {len(note_ids)}")
    print(f"source: {source}")
    if cutoff is not None:
        print(f"older_than_days: {args.older_than}")
        print(f"cutoff: {cutoff}")


def cmd_search(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    """Handle the search command."""
    fts_available = init_db(conn)
    scored, backend = _combined_search(conn, args.query, args.limit, fts_available)
    if not scored:
        print("no matches")
        print(f"semantic_backend={backend}")
        return

    note_ids = [int(row["id"]) for row, _ in scored]
    _mark_recalled(conn, note_ids)
    refreshed = conn.execute(
        f"""
        SELECT id, created_at, source, tags, content, hits, last_seen_at
        FROM notes
        WHERE id IN ({",".join(["?"] * len(note_ids))})
        """,
        note_ids,
    ).fetchall()
    refreshed_by_id = {int(row["id"]): row for row in refreshed}
    print(f"semantic_backend={backend}")
    for row, score in scored:
        current = refreshed_by_id[int(row["id"])]
        print(_format_search_row(current, score))


def cmd_recent(conn: sqlite3.Connection, args: argparse.Namespace) -> None:
    """Handle the recent command."""
    init_db(conn)
    rows = conn.execute(
        """
        SELECT id, created_at, source, tags, content
        FROM notes
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (args.limit,),
    ).fetchall()
    if not rows:
        print("no notes yet")
        return
    for row in rows:
        print(_format_row(row))


def cmd_stats(conn: sqlite3.Connection, _: argparse.Namespace) -> None:
    """Handle the stats command."""
    fts_available = init_db(conn)
    row = conn.execute("SELECT COUNT(*) AS c FROM notes").fetchone()
    count = int(row["c"]) if row else 0
    recalled_row = conn.execute(
        """
        SELECT
            COUNT(*) AS recalled_count,
            COALESCE(AVG(hits), 0) AS avg_hits,
            MAX(last_seen_at) AS latest_seen
        FROM notes
        WHERE hits > 0
        """
    ).fetchone()
    recalled_count = int(recalled_row["recalled_count"]) if recalled_row else 0
    avg_hits = float(recalled_row["avg_hits"]) if recalled_row else 0.0
    latest_seen = recalled_row["latest_seen"] if recalled_row else None
    embedded, total = _embedding_coverage(conn)
    legacy_row = conn.execute(
        "SELECT COUNT(*) AS c FROM notes WHERE source LIKE 'sync:%'"
    ).fetchone()
    legacy_sync_rows = int(legacy_row["c"]) if legacy_row else 0

    print(f"notes: {count}")
    print(f"recalled_notes: {recalled_count}")
    print(f"avg_hits_recalled: {avg_hits:.2f}")
    print(f"latest_last_seen_at: {latest_seen or 'never'}")
    print(f"embedded_notes: {embedded}")
    print(f"embedding_model: {EMBED_MODEL}")
    print(f"semantic_backend: {semantic_backend(conn)}")
    print(f"legacy_sync_rows: {legacy_sync_rows}")
    print(f"db: {DB_PATH}")
    print(f"fts5: {'enabled' if fts_available else 'unavailable (LIKE fallback)'}")
    if total == 0:
        print("embedding_coverage: 0/0")
    else:
        print(f"embedding_coverage: {embedded}/{total}")


def build_parser() -> argparse.ArgumentParser:
    """Build and return the CLI parser."""
    parser = argparse.ArgumentParser(description="Workspace memory CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="initialize memory database")
    init_parser.set_defaults(handler=cmd_init)

    add_parser = subparsers.add_parser("add", help="add a memory note")
    add_parser.add_argument("content", help="note content")
    add_parser.add_argument("--tags", default="", help="comma-separated tags")
    add_parser.add_argument("--source", default="manual", help="source label")
    add_parser.set_defaults(handler=cmd_add)

    sync_parser = subparsers.add_parser("sync", help="database-only sync/health check")
    sync_parser.set_defaults(handler=cmd_sync)

    clean_parser = subparsers.add_parser(
        "cleanup-legacy",
        help="remove legacy sync:* rows and related embeddings",
    )
    clean_parser.set_defaults(handler=cmd_cleanup_legacy)

    backfill_parser = subparsers.add_parser(
        "backfill-embeddings",
        help="create embeddings for notes missing vectors",
    )
    backfill_parser.add_argument("--batch", type=int, default=500, help="max notes per run")
    backfill_parser.set_defaults(handler=cmd_backfill_embeddings)

    prune_parser = subparsers.add_parser(
        "prune",
        help="delete notes by source, optionally older than N days",
    )
    prune_parser.add_argument("--source", required=True, help="exact source label to delete")
    prune_parser.add_argument(
        "--older-than",
        type=int,
        default=None,
        help="delete only notes older than this many days",
    )
    prune_parser.set_defaults(handler=cmd_prune)

    search_parser = subparsers.add_parser("search", help="search memory notes")
    search_parser.add_argument("query", help="search query")
    search_parser.add_argument("--limit", type=int, default=8, help="max results")
    search_parser.set_defaults(handler=cmd_search)

    recent_parser = subparsers.add_parser("recent", help="show recent notes")
    recent_parser.add_argument("--limit", type=int, default=10, help="max results")
    recent_parser.set_defaults(handler=cmd_recent)

    stats_parser = subparsers.add_parser("stats", help="show memory stats")
    stats_parser.set_defaults(handler=cmd_stats)
    return parser


def main() -> int:
    """Entry point for the memory CLI."""
    parser = build_parser()
    args = parser.parse_args()
    conn = connect()
    try:
        args.handler(conn, args)
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
