"""Process eval dataset: extract reference contexts from parquet data and classify question types."""

import json
import os
import re
from pathlib import Path

import pandas as pd
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from dotenv import load_dotenv
from openai import AzureOpenAI

EVAL_DIR = Path(__file__).resolve().parent.parent
ANSWERS_DIR = EVAL_DIR / "answers"
DATASET_PATH = EVAL_DIR / "eval_dataset.json"
# Parquet files live in the server/output directory
OUTPUT_DIR = EVAL_DIR.parent / "server" / "output"

load_dotenv(EVAL_DIR / ".env")


def load_parquet_tables() -> dict[str, pd.DataFrame]:
    """Load text_units and community_reports for citation lookup."""
    return {
        "text_units": pd.read_parquet(OUTPUT_DIR / "text_units.parquet"),
        "community_reports": pd.read_parquet(OUTPUT_DIR / "community_reports.parquet"),
        "entities": pd.read_parquet(OUTPUT_DIR / "entities.parquet"),
    }


# Matches [Data: Sources (1, 2, 3)] or [Data: Reports (21, 70, 69, 68, 20, +more)]
CITATION_PATTERN = re.compile(
    r"\[Data:\s*(Sources|Reports|Entities)\s*\(([^)]+)\)\]"
)


def parse_citations(text: str) -> dict[str, set[int]]:
    """Extract all citation IDs grouped by type (Sources, Reports, Entities)."""
    citations: dict[str, set[int]] = {"Sources": set(), "Reports": set(), "Entities": set()}
    for match in CITATION_PATTERN.finditer(text):
        cite_type = match.group(1)
        ids_str = match.group(2)
        for token in ids_str.split(","):
            token = token.strip()
            if token.isdigit():
                citations[cite_type].add(int(token))
    return citations


def resolve_contexts(
    citations: dict[str, set[int]], tables: dict[str, pd.DataFrame]
) -> list[str]:
    """Look up cited items from parquet tables and return context strings."""
    contexts: list[str] = []

    # Sources -> text_units (raw text only, no labels)
    if citations["Sources"]:
        tu = tables["text_units"]
        matched = tu[tu["human_readable_id"].isin(citations["Sources"])]
        for _, row in matched.iterrows():
            contexts.append(row["text"].strip())

    # Reports -> community_reports (summary text only)
    if citations["Reports"]:
        cr = tables["community_reports"]
        matched = cr[cr["human_readable_id"].isin(citations["Reports"])]
        for _, row in matched.iterrows():
            contexts.append(row["summary"].strip())

    # Entities -> entities (description text only)
    if citations["Entities"]:
        ent = tables["entities"]
        matched = ent[ent["human_readable_id"].isin(citations["Entities"])]
        for _, row in matched.iterrows():
            desc = row.get("description", "")
            if desc:
                contexts.append(desc.strip())

    return contexts


def classify_question_type(question: str, client: AzureOpenAI) -> str:
    """Use an LLM to classify a question as specific, thematic, or cross-document."""
    response = client.chat.completions.create(
        model="gpt-4.1",
        temperature=0,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "classification",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["specific", "thematic", "cross-document"],
                        }
                    },
                    "required": ["type"],
                    "additionalProperties": False,
                },
            },
        },
        messages=[
            {
                "role": "system",
                "content": (
                    "Classify the following question into exactly one category. "
                    "Respond with a JSON object.\n\n"
                    "Categories:\n"
                    "- specific: Questions about particular facts, characters, events, or details\n"
                    "- thematic: Questions about overarching themes, moral lessons, or abstract concepts\n"
                    "- cross-document: Questions requiring synthesis across multiple parts of a document "
                    "or across multiple documents (e.g. tracing a character's arc across chapters, "
                    "comparing events from different sections)"
                ),
            },
            {"role": "user", "content": question},
        ],
    )
    result = json.loads(response.choices[0].message.content or "{}")
    return result.get("type", "cross-document")


def main() -> None:
    print("Loading parquet tables...")
    tables = load_parquet_tables()

    print("Setting up Azure OpenAI client...")
    credential = DefaultAzureCredential()
    token_provider = get_bearer_token_provider(
        credential, "https://cognitiveservices.azure.com/.default"
    )
    client = AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_version="2024-12-01-preview",
        azure_ad_token_provider=token_provider,
    )

    print("Loading eval dataset...")
    with open(DATASET_PATH, encoding="utf-8") as f:
        dataset = json.load(f)

    for i, entry in enumerate(dataset):
        print(f"\n--- Processing entry {i + 1}/{len(dataset)} ---")
        print(f"  Question: {entry['question'][:80]}...")

        # 1. Read reference answer from file
        answer_file = ANSWERS_DIR / f"answer_{i + 1}.txt"
        if not answer_file.exists():
            print(f"  WARNING: {answer_file} not found, skipping.")
            continue
        answer_text = answer_file.read_text(encoding="utf-8").strip()
        entry["reference_answer"] = answer_text

        # 2. Parse citations from the answer and resolve contexts
        citations = parse_citations(answer_text)
        total_cited = sum(len(v) for v in citations.values())
        print(f"  Found {total_cited} citations: "
              f"Sources={sorted(citations['Sources'])}, "
              f"Reports={sorted(citations['Reports'])}, "
              f"Entities={sorted(citations['Entities'])}")

        contexts = resolve_contexts(citations, tables)
        entry["reference_contexts"] = contexts
        print(f"  Resolved {len(contexts)} context items")

        # 3. Classify question type via LLM
        q_type = classify_question_type(entry["question"], client)
        entry["type"] = q_type
        print(f"  Type: {q_type}")

    # Write processed dataset
    with open(DATASET_PATH, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Wrote {len(dataset)} entries to {DATASET_PATH}")


if __name__ == "__main__":
    main()
