"""Utility for generating suggested questions from a GraphRAG-indexed dataset."""

import asyncio
import re
from typing import Any

import pandas as pd
from graphrag_storage import create_storage
from graphrag_storage.tables.table_provider_factory import create_table_provider

import graphrag.api as api
from graphrag.config.load_config import load_config
from graphrag.data_model.data_reader import DataReader

QUESTION_TYPES = ("cross-document", "global", "hidden", "timeline")


def _load_config():
    """Load the graphrag config from the current working directory."""
    return load_config()


def _load_output_tables(
    config, table_names: list[str], optional: list[str] | None = None
) -> dict[str, Any]:
    """Read the indexed parquet tables into DataFrames."""
    storage_obj = create_storage(config.output_storage)
    table_provider = create_table_provider(config.table_provider, storage=storage_obj)
    reader = DataReader(table_provider)

    dataframes: dict[str, Any] = {}
    for name in table_names:
        dataframes[name] = asyncio.run(getattr(reader, name)())

    for name in optional or []:
        if asyncio.run(table_provider.has(name)):
            dataframes[name] = asyncio.run(getattr(reader, name)())
        else:
            dataframes[name] = None

    return dataframes


async def _generate_global(
    config,
    entities: pd.DataFrame,
    communities: pd.DataFrame,
    community_reports: pd.DataFrame,
    community_level: int,
    count: int,
) -> str:
    """Generate questions using global search (map-reduce over community reports)."""
    query = (
        f"Generate a numbered list of {count} diverse and important questions "
        f"that can be answered using this dataset. For each question, tag it with "
        f"exactly one type from: cross-document, global, hidden, timeline. "
        f"Format each line as: NUMBER. [TYPE] QUESTION\n"
        f"Example: 1. [global] What are the major themes?\n"
        f"Return ONLY the numbered list, no extra text."
    )

    response, _ = await api.global_search(
        config=config,
        entities=entities,
        communities=communities,
        community_reports=community_reports,
        community_level=community_level,
        dynamic_community_selection=True,
        response_type="Single paragraph",
        query=query,
    )
    return str(response)


async def _generate_local(
    config,
    entities: pd.DataFrame,
    communities: pd.DataFrame,
    community_reports: pd.DataFrame,
    text_units: pd.DataFrame,
    relationships: pd.DataFrame,
    covariates: pd.DataFrame | None,
    community_level: int,
    count: int,
) -> str:
    """Generate questions using local search (entity-centric, graph + text chunks)."""
    query = (
        f"Generate a numbered list of {count} diverse and specific questions "
        f"about the key entities, relationships, and details in this dataset. "
        f"For each question, tag it with exactly one type from: cross-document, global, hidden, timeline. "
        f"Format each line as: NUMBER. [TYPE] QUESTION\n"
        f"Example: 1. [hidden] What surprising connection exists between X and Y?\n"
        f"Return ONLY the numbered list, no extra text."
    )

    response, _ = await api.local_search(
        config=config,
        entities=entities,
        communities=communities,
        community_reports=community_reports,
        text_units=text_units,
        relationships=relationships,
        covariates=covariates,
        community_level=community_level,
        response_type="Single paragraph",
        query=query,
    )
    return str(response)


def _parse_questions(raw_response: str) -> list[dict[str, str]]:
    """Parse numbered, typed questions from the LLM response.

    Expected format per line: ``1. [global] What are the major themes?``
    Falls back to 'global' if no type tag is found.
    """
    type_pattern = re.compile(r"\[(cross-document|global|hidden|timeline)\]\s*", re.IGNORECASE)
    questions: list[dict[str, str]] = []

    for line in raw_response.strip().splitlines():
        # Strip leading number/bullet
        cleaned = re.sub(r"^\s*(\d+[\.\)]\s*|-\s*)", "", line).strip()
        if not cleaned or len(cleaned) < 10:
            continue

        # Extract type tag
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


def generate_questions(
    mode: str = "global",
    community_level: int = 2,
    count: int = 20,
) -> list[dict[str, str]]:
    """Generate suggested questions from a graphrag-indexed dataset.

    Args:
        mode: 'global' or 'local' search mode.
        community_level: Community hierarchy level to use.
        count: Number of questions to generate.

    Returns:
        List of dicts with 'question' and 'type' keys.
    """
    config = _load_config()

    if mode == "global":
        tables = _load_output_tables(
            config,
            table_names=["entities", "communities", "community_reports"],
        )
        raw = asyncio.run(
            _generate_global(
                config=config,
                entities=tables["entities"],
                communities=tables["communities"],
                community_reports=tables["community_reports"],
                community_level=community_level,
                count=count,
            )
        )
    else:
        tables = _load_output_tables(
            config,
            table_names=[
                "entities",
                "communities",
                "community_reports",
                "text_units",
                "relationships",
            ],
            optional=["covariates"],
        )
        raw = asyncio.run(
            _generate_local(
                config=config,
                entities=tables["entities"],
                communities=tables["communities"],
                community_reports=tables["community_reports"],
                text_units=tables["text_units"],
                relationships=tables["relationships"],
                covariates=tables["covariates"],
                community_level=community_level,
                count=count,
            )
        )

    return _parse_questions(raw)
