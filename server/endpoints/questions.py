"""Questions endpoint — generates suggested questions from the GraphRAG index."""

from fastapi import APIRouter, Query

from utils.graphrag_questions import generate_questions

router = APIRouter(prefix="/api/questions", tags=["questions"])


@router.get("/ask")
def get_ask_questions(
    mode: str = Query("global", pattern="^(global|local)$"),
    community_level: int = Query(2, ge=0),
    count: int = Query(3, ge=1, le=10),
):
    """Generate suggested questions for the Ask tab.

    Query params:
        mode: 'global' or 'local' search mode (default: global)
        community_level: community hierarchy level (default: 2)
        count: number of questions to generate (default: 3)
    """
    return generate_questions(
        mode=mode,
        community_level=community_level,
        count=count,
    )
