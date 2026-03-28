from contextlib import closing
from fastapi import APIRouter
import db

router = APIRouter(prefix="/api")


@router.get("/supply-chains")
async def list_supply_chains():
    with closing(db.get_db()) as conn:
        chains = conn.execute("SELECT * FROM supply_chains").fetchall()
        result = []
        for chain in chains:
            chain_dict = dict(chain)
            nodes = conn.execute(
                "SELECT * FROM supply_chain_nodes WHERE chain_id = ? ORDER BY sort_order",
                (chain_dict["id"],),
            ).fetchall()
            chain_dict["nodes"] = [dict(n) for n in nodes]
            result.append(chain_dict)
        return result
