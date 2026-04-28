from pathlib import Path

def search_text(root: str, query: str) -> list[dict]:
    results: list[dict] = []
    for path in Path(root).rglob("*"):
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue
        if query in text:
            for i, line in enumerate(text.splitlines(), start=1):
                if query in line:
                    results.append({
                        "file": str(path),
                        "line": i,
                        "text": line.strip(),
                    })
    return results[:200]
