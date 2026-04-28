import subprocess
from typing import Optional

def run_command(command: str, cwd: Optional[str] = None) -> dict:
    result = subprocess.run(
        command,
        shell=True,
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    return {
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }
