"""Graph endpoint — serve the pre-indexed knowledge graph for 3D visualization."""

from pathlib import Path

import pandas as pd
from fastapi import APIRouter

router = APIRouter(prefix="/api/graph", tags=["graph"])

_SERVER_ROOT = Path(__file__).resolve().parent.parent
_OUTPUT_DIR = _SERVER_ROOT / "output"


def _load_graph() -> dict:
    """Load parquet files and assemble the full graph payload."""
    entities = pd.read_parquet(_OUTPUT_DIR / "entities.parquet")
    relationships = pd.read_parquet(_OUTPUT_DIR / "relationships.parquet")
    communities = pd.read_parquet(_OUTPUT_DIR / "communities.parquet")
    community_reports = pd.read_parquet(_OUTPUT_DIR / "community_reports.parquet")
    text_units = pd.read_parquet(_OUTPUT_DIR / "text_units.parquet")

    # Build text unit lookup: id → text
    tu_lookup: dict[str, str] = dict(zip(text_units["id"], text_units["text"]))

    # Build community assignment: entity_id → community id (lowest level)
    entity_community: dict[str, int] = {}
    for _, row in communities.iterrows():
        eids = row["entity_ids"]
        if isinstance(eids, list):
            for eid in eids:
                if eid not in entity_community:
                    entity_community[eid] = int(row["community"])

    # Nodes from entities
    nodes = []
    for _, e in entities.iterrows():
        tu_ids = e["text_unit_ids"]
        text_unit_texts = []
        if isinstance(tu_ids, list):
            text_unit_texts = [tu_lookup[tid] for tid in tu_ids if tid in tu_lookup]

        nodes.append(
            {
                "id": e["id"],
                "name": e["title"],
                "type": (e["type"] or "concept").lower(),
                "description": e["description"] or "",
                "community": entity_community.get(e["id"]),
                "degree": int(e["degree"]),
                "frequency": int(e["frequency"]),
                "textUnits": text_unit_texts,
            }
        )

    # Links from relationships
    # Source/target in relationships use entity titles — map to entity IDs
    title_to_id: dict[str, str] = {}
    for _, e in entities.iterrows():
        title_to_id[e["title"]] = e["id"]

    links = []
    for _, r in relationships.iterrows():
        source_id = title_to_id.get(r["source"])
        target_id = title_to_id.get(r["target"])
        if source_id and target_id:
            links.append(
                {
                    "source": source_id,
                    "target": target_id,
                    "description": r["description"] or "",
                    "weight": float(r["weight"]) if pd.notna(r["weight"]) else 1.0,
                }
            )

    # Community metadata from reports (use lowest-level reports)
    comm_data = []
    for _, cr in community_reports.iterrows():
        comm_data.append(
            {
                "id": int(cr["community"]),
                "title": cr["title"] or "",
                "summary": cr["summary"] or "",
                "level": int(cr["level"]),
            }
        )

    return {"nodes": nodes, "links": links, "communities": comm_data}


# Cache the graph in memory after first load
_cached_graph: dict | None = None


@router.get("/explore")
def get_explore_graph():
    """Return the full knowledge graph for 3D visualization."""
    global _cached_graph
    if _cached_graph is None:
        _cached_graph = _load_graph()
    return _cached_graph
