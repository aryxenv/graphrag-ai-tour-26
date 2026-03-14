"""Quick JSONL validator."""
import json, sys

path = "eval_dataset.jsonl"
with open(path, encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
print(f"File size: {sum(len(l.encode('utf-8')) for l in lines)} bytes")
print()

for i, line in enumerate(lines, 1):
    raw = line.strip()
    if not raw:
        print(f"Line {i}: EMPTY (blank line)")
        continue
    try:
        obj = json.loads(raw)
        keys = sorted(obj.keys())
        gt_len = len(obj.get("ground_truth", ""))
        ctx_len = len(obj.get("reference_context", ""))
        print(f"Line {i}: OK  keys={keys}  gt={gt_len}  ctx={ctx_len}")
    except json.JSONDecodeError as e:
        print(f"Line {i}: ** PARSE ERROR ** col={e.colno} msg={e.msg}")
        print(f"  First 200 chars: {raw[:200]}")
        sys.exit(1)

# Check for BOM
with open(path, "rb") as f:
    first3 = f.read(3)
    if first3 == b"\xef\xbb\xbf":
        print("\nWARNING: File has UTF-8 BOM — some parsers choke on this!")
    else:
        print(f"\nNo BOM detected (first bytes: {first3.hex()})")

# Check line endings
with open(path, "rb") as f:
    content = f.read()
    crlf = content.count(b"\r\n")
    lf_only = content.count(b"\n") - crlf
    print(f"Line endings: {crlf} CRLF, {lf_only} LF-only")

print("\nAll lines valid JSON.")
