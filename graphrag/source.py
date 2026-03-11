import pandas as pd

entities = pd.read_parquet("output/entities.parquet")
reports = pd.read_parquet("output/community_reports.parquet")

# GraphRAG citations like [Data: Entities (59, 12, 60, 13, 29, 24); Reports (6)]
# use the human_readable_id column, NOT the UUID id column.

# Look up cited entities
cited_entity_ids = [59, 12, 60, 13, 29, 24]
cited_entities = entities[entities["human_readable_id"].isin(cited_entity_ids)]
print("=== Cited Entities ===")
print(cited_entities[["human_readable_id", "title", "type", "description"]].to_string(max_colwidth=100))

print()

# Look up cited reports
cited_report_ids = [6]
cited_reports = reports[reports["human_readable_id"].isin(cited_report_ids)]
print("=== Cited Reports ===")
print(cited_reports[["human_readable_id", "title", "summary"]].to_string(max_colwidth=100))