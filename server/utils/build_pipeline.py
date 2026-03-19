"""Build tab pipeline utilities — fully isolated from pre-indexed data.

Generates memos via Azure OpenAI, indexes them with GraphRAG, and provides
graph visualization and question generation for build sessions.  Each session
gets its own workspace under server/build_sessions/{session_id}/ and NEVER
touches the pre-indexed data in server/output/.
"""

import json
import os
import re
import shutil
from pathlib import Path

import pandas as pd
import yaml
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from graphrag.api import build_index
from graphrag.callbacks.workflow_callbacks import WorkflowCallbacks
from graphrag.config.load_config import load_config
from graphrag.logger.progress import Progress
from openai import AzureOpenAI

_SERVER_ROOT = Path(__file__).resolve().parent.parent

_credential = DefaultAzureCredential()
_token_provider = get_bearer_token_provider(
    _credential, "https://cognitiveservices.azure.com/.default"
)


def _get_openai_client() -> AzureOpenAI:
    return AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_version="2024-12-01-preview",
        azure_ad_token_provider=_token_provider,
    )


def _get_workspace_path(session_id: str) -> Path:
    """Return the workspace path for a build session, validating session_id."""
    if not re.match(r"^[a-zA-Z0-9\-]+$", session_id):
        raise ValueError(f"Invalid session_id: {session_id!r}")
    return _SERVER_ROOT / "build_sessions" / session_id


# ---------------------------------------------------------------------------
# Scenario-specific system prompts for memo generation
# ---------------------------------------------------------------------------

_SCENARIO_PROMPTS = {
    "tech-startup": (
        "You are a creative writing assistant generating realistic internal corporate memos "
        "for a fictional TECH STARTUP called 'NovaSpark AI'. The company is a Series-B AI "
        "startup with ~120 employees, headquartered in San Francisco with a satellite office "
        "in Austin.\n\n"
        "Key people to weave across memos:\n"
        "- Maya Chen (CEO & Co-founder)\n"
        "- Raj Patel (CTO & Co-founder)\n"
        "- Sofia Bergström (VP Engineering)\n"
        "- James O'Brien (VP Sales)\n"
        "- Priya Sharma (Head of Product)\n"
        "- Carlos Mendez (Lead ML Engineer)\n"
        "- Aisha Johnson (Head of People Ops)\n"
        "- Tom Nguyen (CFO)\n\n"
        "Key projects/entities to reference across memos:\n"
        "- Project Aurora (flagship AI platform)\n"
        "- Partnership with DataVault Corp\n"
        "- Upcoming Series C funding round\n"
        "- The Austin office expansion\n"
        "- Customer: MedLine Health Systems\n"
        "- Competitor: Synthetica Labs\n\n"
        "Generate memos that are interconnected — decisions in one memo should have "
        "consequences referenced in others. People should appear in multiple memos in "
        "different contexts. Include realistic dates within a 3-month window."
    ),
    "hospital": (
        "You are a creative writing assistant generating realistic internal memos for a "
        "fictional HOSPITAL called 'Riverside General Medical Center', a 500-bed teaching "
        "hospital affiliated with the local university, located in Portland, Oregon.\n\n"
        "Key people to weave across memos:\n"
        "- Dr. Eleanor Walsh (Chief Medical Officer)\n"
        "- Dr. Marcus Kim (Chief of Surgery)\n"
        "- Nurse Director Patricia Owens (Director of Nursing)\n"
        "- Dr. Amara Osei (Head of Emergency Medicine)\n"
        "- Robert Flanagan (Hospital Administrator / CEO)\n"
        "- Dr. Yuki Tanaka (Chief of Radiology)\n"
        "- Linda Hofstetter (VP of Compliance & Risk)\n"
        "- Dr. Samuel Rivera (Chief Resident, Internal Medicine)\n\n"
        "Key projects/entities to reference across memos:\n"
        "- New West Wing construction project\n"
        "- Electronic Health Records migration to 'MedConnect' platform\n"
        "- Joint Commission accreditation review\n"
        "- Partnership with Portland University School of Medicine\n"
        "- Patient safety initiative 'Zero Harm 2025'\n"
        "- Nursing staff shortage and recruitment drive\n\n"
        "Generate memos that are interconnected — staffing decisions affect patient care, "
        "construction impacts department relocations, compliance issues touch multiple "
        "departments. Include realistic dates within a 3-month window."
    ),
    "law-firm": (
        "You are a creative writing assistant generating realistic internal memos for a "
        "fictional LAW FIRM called 'Hargrove, Chen & Associates LLP', a mid-size firm with "
        "~80 attorneys, headquartered in Chicago with offices in New York and Washington D.C.\n\n"
        "Key people to weave across memos:\n"
        "- Margaret Hargrove (Managing Partner)\n"
        "- David Chen (Senior Partner, Litigation)\n"
        "- Rachel Abramowitz (Partner, Corporate & M&A)\n"
        "- Jonathan Blake (Partner, Intellectual Property)\n"
        "- Kenji Watanabe (Of Counsel, International Trade)\n"
        "- Sarah Mitchell (Associate, Rising Star in Litigation)\n"
        "- Omar Hassan (Chief Operating Officer)\n"
        "- Diana Reeves (Head of Pro Bono & Community Engagement)\n\n"
        "Key projects/entities to reference across memos:\n"
        "- Titan Industries merger (major M&A case)\n"
        "- Pro bono partnership with Legal Aid Chicago\n"
        "- Firm-wide transition to 'CasePilot' case management software\n"
        "- Opening of the Washington D.C. office\n"
        "- Client: GreenLeaf Pharmaceuticals (patent dispute)\n"
        "- Annual partner retreat and strategic planning\n\n"
        "Generate memos that are interconnected — case outcomes affect firm strategy, "
        "staffing changes impact multiple practice areas, technology rollouts create "
        "cross-departmental friction. Include realistic dates within a 3-month window."
    ),
}

_MEMO_USER_PROMPT = (
    "Generate exactly {count} interconnected corporate memos as a JSON object with a "
    'single key "memos" containing an array. Each memo must have:\n'
    '- "id": integer starting from 1\n'
    '- "title": a concise, realistic memo subject line\n'
    '- "date": a date in YYYY-MM-DD format\n'
    '- "content": 2-4 paragraphs of realistic memo body text\n\n'
    "Requirements:\n"
    "- At least 3 named people must appear in 2+ different memos\n"
    "- At least 2 memos must reference decisions or events from other memos\n"
    "- Each memo should be 150-300 words\n"
    "- Use realistic corporate language appropriate to the organization type\n\n"
    "Return ONLY the JSON object, no markdown fencing or explanation."
)


def generate_memos(scenario: str, count: int) -> list[dict]:
    """Generate interconnected corporate memos via Azure OpenAI.

    Args:
        scenario: One of 'tech-startup', 'hospital', 'law-firm'.
        count: Number of memos to generate.

    Returns:
        List of dicts with keys: id, title, content, date.
    """
    system_prompt = _SCENARIO_PROMPTS.get(scenario)
    if system_prompt is None:
        raise ValueError(
            f"Unknown scenario {scenario!r}. "
            f"Choose from: {', '.join(_SCENARIO_PROMPTS)}"
        )

    client = _get_openai_client()
    response = client.chat.completions.create(
        model="gpt-4.1",
        temperature=0.9,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": _MEMO_USER_PROMPT.format(count=count)},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    parsed = json.loads(raw)
    # Handle both {"memos": [...]} and direct [...]
    if isinstance(parsed, dict):
        return parsed.get("memos", [])
    return parsed


# ---------------------------------------------------------------------------
# Workspace management
# ---------------------------------------------------------------------------


def create_workspace(session_id: str) -> Path:
    """Create an isolated workspace for a build session.

    Creates directory structure, copies prompts, and writes an adjusted
    settings.yaml with all paths pointing to the workspace subdirectories.

    Returns:
        The workspace root path.
    """
    workspace = _get_workspace_path(session_id)

    # Create subdirectories
    for subdir in ("input", "output", "cache", "logs"):
        (workspace / subdir).mkdir(parents=True, exist_ok=True)

    # Copy prompts from server/prompts/
    prompts_dst = workspace / "prompts"
    prompts_src = _SERVER_ROOT / "prompts"
    if prompts_src.exists():
        if prompts_dst.exists():
            shutil.rmtree(prompts_dst)
        shutil.copytree(prompts_src, prompts_dst)
    else:
        raise FileNotFoundError(
            f"Prompts directory not found at {prompts_src}. "
            "Ensure server/prompts/ contains the GraphRAG prompt templates."
        )

    # Read the base settings.yaml and adjust paths
    base_settings = _SERVER_ROOT / "settings.yaml"
    with open(base_settings, encoding="utf-8") as f:
        settings = yaml.safe_load(f)

    ws = str(workspace)

    # Storage paths
    if "input_storage" in settings:
        settings["input_storage"]["base_dir"] = str(workspace / "input")
    if "output_storage" in settings:
        settings["output_storage"]["base_dir"] = str(workspace / "output")
    if "cache" in settings and "storage" in settings["cache"]:
        settings["cache"]["storage"]["base_dir"] = str(workspace / "cache")
    if "reporting" in settings:
        settings["reporting"]["base_dir"] = str(workspace / "logs")
    if "vector_store" in settings:
        settings["vector_store"]["db_uri"] = str(workspace / "output" / "lancedb")

    # Prompt paths — workflow settings
    _prompt_mappings = {
        "extract_graph": ["prompt"],
        "summarize_descriptions": ["prompt"],
        "extract_claims": ["prompt"],
        "community_reports": ["graph_prompt", "text_prompt"],
    }
    for section, keys in _prompt_mappings.items():
        if section in settings:
            for key in keys:
                if key in settings[section]:
                    filename = Path(settings[section][key]).name
                    settings[section][key] = str(workspace / "prompts" / filename)

    # Prompt paths — query settings
    _query_prompt_mappings = {
        "local_search": ["prompt"],
        "global_search": ["map_prompt", "reduce_prompt", "knowledge_prompt"],
        "drift_search": ["prompt", "reduce_prompt"],
        "basic_search": ["prompt"],
    }
    for section, keys in _query_prompt_mappings.items():
        if section in settings:
            for key in keys:
                if key in settings[section]:
                    filename = Path(settings[section][key]).name
                    settings[section][key] = str(workspace / "prompts" / filename)

    # Write adjusted settings
    with open(workspace / "settings.yaml", "w", encoding="utf-8") as f:
        yaml.dump(settings, f, default_flow_style=False, sort_keys=False)

    return workspace


def write_memos_to_workspace(session_id: str, memos: list[dict]) -> None:
    """Write each memo as a separate .txt file to the workspace input directory."""
    workspace = _get_workspace_path(session_id)
    input_dir = workspace / "input"
    input_dir.mkdir(parents=True, exist_ok=True)

    for memo in memos:
        filename = f"memo_{memo['id']}.txt"
        content = f"MEMO: {memo['title']}\nDATE: {memo['date']}\n\n{memo['content']}"
        (input_dir / filename).write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# Indexing
# ---------------------------------------------------------------------------


class _BuildProgressCallbacks:
    """WorkflowCallbacks implementation that delegates to a progress_callback."""

    def __init__(self, progress_callback=None):
        self._cb = progress_callback
        self._current_workflow: str = ""

    def pipeline_start(self, names: list[str]) -> None:
        pass

    def pipeline_end(self, results) -> None:
        pass

    def pipeline_error(self, error: BaseException) -> None:
        pass

    def workflow_start(self, name: str, instance: object) -> None:
        self._current_workflow = name
        if self._cb:
            self._cb(name, "started", 0, 0)

    def workflow_end(self, name: str, instance: object) -> None:
        if self._cb:
            self._cb(name, "completed", 0, 0)

    def progress(self, progress: Progress) -> None:
        if self._cb and self._current_workflow:
            self._cb(
                self._current_workflow,
                progress.description or "",
                progress.completed_items or 0,
                progress.total_items or 0,
            )


import asyncio as _asyncio


def run_indexing(session_id: str, progress_callback=None) -> list:
    """Run GraphRAG indexing on the workspace.

    Args:
        session_id: The build session identifier.
        progress_callback: Optional callable(workflow_name, description, completed, total).

    Returns:
        List of PipelineRunResult from GraphRAG.
    """
    workspace = _get_workspace_path(session_id)
    config = load_config(root_dir=str(workspace))
    callbacks = _BuildProgressCallbacks(progress_callback)
    # build_index is async — run it in its own event loop (called from sync thread)
    loop = _asyncio.new_event_loop()
    try:
        return loop.run_until_complete(
            build_index(config=config, callbacks=[callbacks])
        )
    finally:
        loop.close()


# ---------------------------------------------------------------------------
# Graph loading (mirrors server/endpoints/graph.py but reads from workspace)
# ---------------------------------------------------------------------------


def load_build_graph(session_id: str) -> dict:
    """Load the indexed graph from the session workspace output.

    Returns:
        Dict with 'nodes', 'links', and 'communities' lists.
    """
    output_dir = _get_workspace_path(session_id) / "output"

    entities = pd.read_parquet(output_dir / "entities.parquet")
    relationships = pd.read_parquet(output_dir / "relationships.parquet")
    communities = pd.read_parquet(output_dir / "communities.parquet")
    community_reports = pd.read_parquet(output_dir / "community_reports.parquet")
    text_units = pd.read_parquet(output_dir / "text_units.parquet")

    # Text unit lookup: id → text
    tu_lookup: dict[str, str] = dict(zip(text_units["id"], text_units["text"]))

    # Community assignment: entity_id → community id (lowest level)
    entity_community: dict[str, int] = {}
    for _, row in communities.iterrows():
        eids = row["entity_ids"]
        if isinstance(eids, list):
            for eid in eids:
                if eid not in entity_community:
                    entity_community[eid] = int(row["community"])

    # Nodes
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

    # Links — source/target use entity titles, map to IDs
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

    # Communities
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


# ---------------------------------------------------------------------------
# Question generation (mirrors server/utils/graphrag_questions.py)
# ---------------------------------------------------------------------------


def generate_build_questions(session_id: str, count: int = 3) -> list[dict]:
    """Generate questions from the session workspace's community reports.

    Args:
        session_id: The build session identifier.
        count: Number of questions to generate.

    Returns:
        List of dicts with 'question' and 'type' keys.
    """
    output_dir = _get_workspace_path(session_id) / "output"
    reports_path = output_dir / "community_reports.parquet"
    df = pd.read_parquet(reports_path)

    # Sample up to 15 community report summaries
    sample = df.sample(n=min(15, len(df)))
    summaries = []
    for _, row in sample.iterrows():
        summaries.append(f"**{row['title']}**: {row['summary']}")
    summaries_text = "\n\n".join(summaries)

    client = _get_openai_client()
    response = client.chat.completions.create(
        model="gpt-4.1",
        temperature=0.9,
        messages=[
            {
                "role": "system",
                "content": (
                    "You generate short, compelling questions from knowledge graph summaries. "
                    "Your questions must showcase what a knowledge graph can do that simple "
                    "text search cannot:\n"
                    "- Synthesize across many documents\n"
                    "- Reveal hidden connections between entities\n"
                    "- Trace themes or changes across time\n"
                    "- Compare or contrast distant parts of the corpus\n\n"
                    "Rules:\n"
                    "- Each question MUST be under 80 characters\n"
                    "- Each question must NOT be answerable from a single paragraph\n"
                    "- Keep questions simple-sounding but requiring deep synthesis\n"
                    "- Tag each with one type: cross-document, global, hidden, or timeline"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Knowledge graph summaries:\n\n{summaries_text}\n\n"
                    f"Generate exactly {count} broad questions about themes, patterns, or "
                    f"comparisons that span the ENTIRE dataset.\n\n"
                    f"Format: NUMBER. [TYPE] QUESTION\n"
                    f"Return ONLY the numbered list, nothing else."
                ),
            },
        ],
    )

    raw = response.choices[0].message.content or ""
    return _parse_question_response(raw)


def _parse_question_response(raw_response: str) -> list[dict]:
    """Parse numbered, typed questions from the LLM response."""
    type_pattern = re.compile(
        r"\[(cross-document|global|hidden|timeline)\]\s*", re.IGNORECASE
    )
    questions: list[dict] = []

    for line in raw_response.strip().splitlines():
        cleaned = re.sub(r"^\s*(\d+[\.\)]\s*|-\s*)", "", line).strip()
        if not cleaned or len(cleaned) < 10:
            continue
        m = type_pattern.search(cleaned)
        if m:
            q_type = m.group(1).lower()
            q_text = type_pattern.sub("", cleaned).strip()
        else:
            q_type = "global"
            q_text = cleaned
        if q_text:
            questions.append({"question": q_text, "type": q_type})

    return questions


# ---------------------------------------------------------------------------
# Context extraction (mirrors server/endpoints/evaluate.py)
# ---------------------------------------------------------------------------

_CITE_RE = re.compile(r"\[Data:\s*(Sources|Reports|Entities)\s*\(([^)]+)\)\]")


def extract_build_context(session_id: str, response_text: str) -> str:
    """Parse [Data: Sources/Reports/Entities (...)] citations from a response.

    Reads parquet files from the session workspace output (not server/output/).

    Args:
        session_id: The build session identifier.
        response_text: The GraphRAG response text containing citations.

    Returns:
        Concatenated context text from cited sources.
    """
    cites: dict[str, set[int]] = {
        "Sources": set(),
        "Reports": set(),
        "Entities": set(),
    }
    for m in _CITE_RE.finditer(response_text):
        for tok in m.group(2).split(","):
            tok = tok.strip()
            if tok.isdigit():
                cites[m.group(1)].add(int(tok))

    if not any(cites.values()):
        return ""

    output_dir = _get_workspace_path(session_id) / "output"
    parts: list[str] = []

    if cites["Sources"]:
        tu = pd.read_parquet(output_dir / "text_units.parquet")
        for _, r in tu[tu["human_readable_id"].isin(cites["Sources"])].iterrows():
            parts.append(r["text"].strip())

    if cites["Reports"]:
        cr = pd.read_parquet(output_dir / "community_reports.parquet")
        for _, r in cr[cr["human_readable_id"].isin(cites["Reports"])].iterrows():
            parts.append(r["summary"].strip())

    if cites["Entities"]:
        ent = pd.read_parquet(output_dir / "entities.parquet")
        for _, r in ent[ent["human_readable_id"].isin(cites["Entities"])].iterrows():
            d = r.get("description", "")
            if d:
                parts.append(d.strip())

    return "\n\n---\n\n".join(parts)


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------


def cleanup_workspace(session_id: str) -> None:
    """Delete the entire workspace directory for a build session."""
    workspace = _get_workspace_path(session_id)
    shutil.rmtree(workspace, ignore_errors=True)
