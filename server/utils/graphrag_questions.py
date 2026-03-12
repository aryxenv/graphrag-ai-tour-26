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
        focus = (
            "broad questions about themes, patterns, or comparisons that span the ENTIRE dataset. "
            "These questions should require synthesizing information from many different parts of the text — "
            "NOT answerable from any single paragraph or passage."
        )
        examples = (
            "1. [global] What are the recurring moral lessons across all character arcs?\n"
            "2. [cross-document] How do different characters' views on wealth contrast?"
        )
    else:
        focus = (
            "specific questions about entity relationships, hidden connections, or multi-hop reasoning. "
            "These questions should require connecting 2-3 entities or events that are NOT directly mentioned together — "
            "questions that only a knowledge graph could answer well."
        )
        examples = (
            "1. [hidden] How does Fezziwig's generosity contrast with Scrooge's treatment of Cratchit?\n"
            "2. [timeline] How does Scrooge's emotional state change across the three ghostly visits?"
        )

    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {
                "role": "system",
                "content": (
                    "You generate short, compelling questions from knowledge graph summaries. "
                    "Your questions must showcase what a knowledge graph can do that simple text search cannot:\n"
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
                    f"Knowledge graph summaries:\n\n{summaries}\n\n"
                    f"Generate exactly {count} {focus}\n\n"
                    f"Examples of good questions:\n{examples}\n\n"
                    f"Format: NUMBER. [TYPE] QUESTION\n"
                    f"Return ONLY the numbered list, nothing else."
                ),
            },
        ],
        temperature=0.9,
    )

    raw = response.choices[0].message.content or ""
    return _parse_questions(raw)
