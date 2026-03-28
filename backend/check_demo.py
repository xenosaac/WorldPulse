"""Pre-demo validation: checks that all required pieces are in place."""

import os
import sys
import sqlite3

import db


def check(label: str, passed: bool) -> bool:
    mark = "\u2713" if passed else "\u2717"
    print(f"  [{mark}] {label}")
    return passed


def main():
    all_ok = True

    # 1. GEMINI_API_KEY
    api_key = os.environ.get("GEMINI_API_KEY")
    all_ok &= check("GEMINI_API_KEY env var exists", api_key is not None and len(api_key) > 0)

    # 2. Database file exists
    db_exists = os.path.exists(db.DB_PATH)
    all_ok &= check(f"{db.DB_PATH} exists", db_exists)

    if db_exists:
        conn = sqlite3.connect(db.DB_PATH)

        # 3. Events table has rows
        events_count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        all_ok &= check(f"events table has > 0 rows (found {events_count})", events_count > 0)

        # 4. Supply chain nodes table has rows
        nodes_count = conn.execute("SELECT COUNT(*) FROM supply_chain_nodes").fetchone()[0]
        all_ok &= check(
            f"supply_chain_nodes table has > 0 rows (found {nodes_count})",
            nodes_count > 0,
        )

        # 5. Fallbacks table has rows
        fallbacks_count = conn.execute("SELECT COUNT(*) FROM fallbacks").fetchone()[0]
        all_ok &= check(
            f"fallbacks table has > 0 rows (found {fallbacks_count})",
            fallbacks_count > 0,
        )

        conn.close()
    else:
        all_ok &= check("events table has > 0 rows", False)
        all_ok &= check("supply_chain_nodes table has > 0 rows", False)
        all_ok &= check("fallbacks table has > 0 rows", False)

    print()
    if all_ok:
        print("All checks passed. Ready for demo!")
    else:
        print("Some checks failed. Fix the issues above before demo.")
        sys.exit(1)


if __name__ == "__main__":
    main()
