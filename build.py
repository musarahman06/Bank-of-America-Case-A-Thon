"""Build the whole app: synthetic data -> trained models -> frontend bundle.

Vercel runs this after installing Python dependencies (see pyproject.toml).
Locally:  python build.py   then   uvicorn backend.app.main:app
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent


def run(cmd, cwd):
    print(f"$ {' '.join(cmd)}  (in {cwd.name}/)", flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


def main():
    backend, frontend = ROOT / "backend", ROOT / "frontend"
    run([sys.executable, "-m", "data.generate_data"], backend)
    run([sys.executable, "-m", "ml.train"], backend)
    run(["npm", "ci"], frontend)
    run(["npm", "run", "build"], frontend)


if __name__ == "__main__":
    main()
