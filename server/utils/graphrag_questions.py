"""Utility for generating suggested questions from a GraphRAG-indexed dataset.

Instead of running the full search pipeline (slow, map-reduce over all reports),
we read top community report summaries directly and make a single LLM call.
"""

import os
import re
from pathlib import Path

import pandas as pd
from openai import AzureOpenAI

# server/ directory — where settings.yaml and output/ live
_SERVER_ROOT = Path(__file__).resolve().parent.parent


def _get_client() -> AzureOpenAI:
    """Create an Azure OpenAI client from environment variables."""
    return AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        azure_deployment="gpt-4.1",
        api_version="2024-12-01-preview",
        # Uses DefaultAzureCredential when no api_key is set
        azure_ad_token_provider=_get_token_provider(),
    )


def _get_token_provider():
    from azure.identity import DefaultAzureCredential, get_bearer_token_provider
    credential = DefaultAzureCredential()
    return get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")


def _load_report_summaries(level: int, max_reports: int = 15) -> str:
    """Load top-ranked community report summaries from parquet."""
    path = _SERVER_ROOT / "output" / "community_reports.parquet"
    df = pd.read_parquet(path)
    # Filter by community level, then pick a random sample
    level_df = df[df["level"] == level]
    if level_df.empty:
        level_df = df
    sample = level_df.sample(n=min(max_reports, len(level_df)))
    summaries = []
    for _, row in sample.iterrows():
        summaries.append(f"**{row['title']}**: {row['summary']}")
    return "\n\n".join(summaries)


def _parse_questions(raw_response: str) -> list[dict[str, str]]:
    """Parse numbered, typed questions from the LLM response."""
    type_pattern = re.compile(r"\[(cross-document|global|hidden|timeline)\]\s*", re.IGNORECASE)
    questions: list[dict[str, str]] = []

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


def generate_questions(
    mode: str = "global",
    community_level: int = 2,
    count: int = 3,
) -> list[dict[str, str]]:
    """Generate suggested questions from community report summaries.

    Makes a single LLM call instead of running the full search pipeline.

    Args:
        mode: 'global' or 'local' — hint for the kind of questions to generate.
        community_level: Community hierarchy level to pull reports from.
        count: Number of questions to generate.

    Returns:
        List of dicts with 'question' and 'type' keys.
    """
    summaries = _load_report_summaries(community_level)
    client = _get_client()

    if mode == "global":
        focus = "broad, high-level questions about dataset-wide themes and patterns"
    else:
        focus = "specific, detailed questions about particular entities, relationships, and events"

    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a question generator. Given summaries of a knowledge graph, "
                    "generate interesting questions that a user might want to ask about the dataset. "
                    "Tag each question with exactly one type: cross-document, global, hidden, or timeline."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Here are summaries from the knowledge graph:\n\n{summaries}\n\n"
                    f"Generate exactly {count} {focus}.\n"
                    f"Format each line as: NUMBER. [TYPE] QUESTION\n"
                    f"Example: 1. [global] What are the major themes?\n"
                    f"Return ONLY the numbered list."
                ),
            },
        ],
        temperature=0.9,
    )

    raw = response.choices[0].message.content or ""
    return _parse_questions(raw)
