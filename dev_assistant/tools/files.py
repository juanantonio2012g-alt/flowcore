from pathlib import Path

def read_file(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")

def write_file(path: str, content: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")

def replace_in_file(path: str, old: str, new: str) -> bool:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        return False
    p.write_text(text.replace(old, new, 1), encoding="utf-8")
    return True

def list_files(root: str) -> list[str]:
    return [str(p) for p in Path(root).rglob("*") if p.is_file()]
