from .terminal import run_command

def git_status(cwd: str) -> dict:
    return run_command("git status --short", cwd=cwd)

def git_diff(cwd: str) -> dict:
    return run_command("git diff", cwd=cwd)
