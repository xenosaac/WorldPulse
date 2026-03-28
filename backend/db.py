import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "world_pulse.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    affected_sectors TEXT,
    source_type TEXT CHECK(source_type IN ('news', 'video', 'social', 'data')),
    source_url TEXT,
    confidence REAL,
    evidence TEXT,
    video_timestamp REAL,
    extracted_at TEXT,
    raw_gemini_response TEXT
);

CREATE TABLE IF NOT EXISTS supply_chains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS supply_chain_nodes (
    id TEXT PRIMARY KEY,
    chain_id TEXT REFERENCES supply_chains(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    country TEXT,
    risk_level TEXT DEFAULT 'normal',
    sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS scenario_results (
    id TEXT PRIMARY KEY,
    scenario_input TEXT NOT NULL,
    chain_id TEXT REFERENCES supply_chains(id),
    impact_chain TEXT,
    overall_risk TEXT,
    gemini_response TEXT,
    source TEXT DEFAULT 'text',
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS risk_briefs (
    id TEXT PRIMARY KEY,
    chain_id TEXT REFERENCES supply_chains(id),
    scenario_id TEXT REFERENCES scenario_results(id),
    executive_summary TEXT,
    risk_matrix TEXT,
    scenario_analysis TEXT,
    recommendations TEXT,
    key_indicators TEXT,
    full_report TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS fallbacks (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    input_hash TEXT,
    response TEXT NOT NULL,
    created_at TEXT
);
"""


def init_db():
    """Create all tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def get_db() -> sqlite3.Connection:
    """Return a connection with Row factory enabled."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn
