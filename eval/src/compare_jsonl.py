"""Compare data-sample.jsonl (working) vs eval_dataset.jsonl (failing) for format mismatches."""
import json, sys

def analyze(path, label):
    with open(path, "rb") as f:
        raw = f.read()

    print(f"=== {label} ({path}) ===")
    bom_marker = b'\xef\xbb\xbf'
    print(f"  File size: {len(raw)} bytes")
    print(f"  BOM: {raw[:3] == bom_marker}")
    crlf = raw.count(b'\r\n')
    lf = raw.count(b'\n') - crlf
    nulls = raw.count(b'\x00')
    tabs = raw.count(b'\t')
    print(f"  CRLF count: {crlf}")
    print(f"  LF-only: {lf}")
    print(f"  Null bytes: {nulls}")
    print(f"  Tab chars: {tabs}")

    lines = raw.decode("utf-8").splitlines()
    print(f"  Lines: {len(lines)}")

    for i, line in enumerate(lines):
        if not line.strip():
            print(f"  Line {i}: EMPTY")
            continue
        obj = json.loads(line)
        sizes = {k: len(str(v)) for k, v in obj.items()}
        print(f"  Line {i}: keys={sorted(obj.keys())}  sizes={sizes}  bytes={len(line.encode('utf-8'))}")

        # Check for problematic chars in values
        for k, v in obj.items():
            if not isinstance(v, str):
                print(f"    !!! {k} is {type(v).__name__}, not str")
                continue
            issues = []
            if "\x00" in v: issues.append("NULL")
            if "\r" in v: issues.append("CR")
            if "\ufeff" in v: issues.append("BOM_IN_VALUE")
            if "\u2019" in v: issues.append("CURLY_QUOTE")
            if "\u201c" in v or "\u201d" in v: issues.append("CURLY_DBLQUOTE")
            if "\\" in v: issues.append(f"BACKSLASH({v.count(chr(92))})")
            if issues:
                print(f"    {k}: {', '.join(issues)}")

    print()


analyze("data-sample.jsonl", "GOOD")
analyze("eval_dataset.jsonl", "BAD")

# Check if the bad file exceeds any size limits per line
print("=== SIZE COMPARISON ===")
with open("eval_dataset.jsonl", encoding="utf-8") as f:
    for i, line in enumerate(f):
        mb = len(line.encode("utf-8")) / 1024 / 1024
        if mb > 1:
            print(f"  Line {i}: {mb:.2f} MB  *** OVER 1MB ***")
        elif mb > 0.1:
            print(f"  Line {i}: {mb:.2f} MB")
