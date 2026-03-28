"""Seed the database from ../data/seed.json."""

import json
import os
import sys

import db

RESET_TABLES = (
    "risk_briefs",
    "scenario_results",
    "supply_chain_nodes",
    "supply_chains",
    "events",
    "fallbacks",
)


def seed():
    seed_path = os.path.join(os.path.dirname(__file__), "..", "data", "seed.json")
    seed_path = os.path.abspath(seed_path)

    if not os.path.exists(seed_path):
        print(f"ERROR: seed.json not found at {seed_path}")
        sys.exit(1)

    with open(seed_path, "r") as f:
        data = json.load(f)

    db.init_db()
    conn = db.get_db()

    # Reset demo-managed tables so every seed produces the same baseline state.
    for table in RESET_TABLES:
        conn.execute(f"DELETE FROM {table}")

    # Insert events
    events = data.get("events", [])
    for e in events:
        conn.execute(
            """INSERT OR REPLACE INTO events
               (id, title, description, lat, lng, severity, affected_sectors,
                source_type, source_url, confidence, evidence, video_timestamp,
                extracted_at, raw_gemini_response)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                e["id"],
                e["title"],
                e.get("description"),
                e["lat"],
                e["lng"],
                e.get("severity"),
                json.dumps(e.get("affected_sectors")) if e.get("affected_sectors") else None,
                e.get("source_type"),
                e.get("source_url"),
                e.get("confidence"),
                e.get("evidence"),
                e.get("video_timestamp"),
                e.get("extracted_at"),
                e.get("raw_gemini_response"),
            ),
        )
    print(f"Inserted {len(events)} events")

    # Insert supply chains
    chains = data.get("supply_chains", [])
    for c in chains:
        conn.execute(
            """INSERT OR REPLACE INTO supply_chains (id, name, description)
               VALUES (?, ?, ?)""",
            (c["id"], c["name"], c.get("description")),
        )
    print(f"Inserted {len(chains)} supply chains")

    # Insert supply chain nodes
    nodes = data.get("supply_chain_nodes", [])
    for n in nodes:
        conn.execute(
            """INSERT OR REPLACE INTO supply_chain_nodes
               (id, chain_id, name, role, lat, lng, country, risk_level, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                n["id"],
                n["chain_id"],
                n["name"],
                n["role"],
                n["lat"],
                n["lng"],
                n.get("country"),
                n.get("risk_level", "normal"),
                n.get("sort_order"),
            ),
        )
    print(f"Inserted {len(nodes)} supply chain nodes")

    # Insert fallbacks
    fallbacks = data.get("fallbacks", [])
    for fb in fallbacks:
        response = fb["response"]
        if isinstance(response, dict) or isinstance(response, list):
            response = json.dumps(response)
        conn.execute(
            """INSERT OR REPLACE INTO fallbacks
               (id, endpoint, input_hash, response, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (
                fb["id"],
                fb["endpoint"],
                fb.get("input_hash"),
                response,
                fb.get("created_at"),
            ),
        )
    print(f"Inserted {len(fallbacks)} fallbacks")

    conn.commit()
    conn.close()
    print("Seeding complete.")


if __name__ == "__main__":
    seed()
