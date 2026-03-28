#!/usr/bin/env python3
"""World Pulse — one-command launcher. Works on macOS, Linux, and Windows."""

import os
import sys
import shutil
import signal
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

C = "\033[0;36m"
G = "\033[0;32m"
Y = "\033[1;33m"
R = "\033[0m"

def run(cmd, cwd=None, check=True, **kwargs):
    return subprocess.run(cmd, cwd=cwd, check=check, **kwargs)

def find_python():
    for name in ("python3", "python"):
        path = shutil.which(name)
        if path:
            result = subprocess.run([path, "--version"], capture_output=True, text=True)
            if result.returncode == 0 and "3." in result.stdout:
                return path
    return None

def find_npm():
    return shutil.which("npm")

def venv_python():
    if sys.platform == "win32":
        return str(BACKEND / ".venv" / "Scripts" / "python.exe")
    return str(BACKEND / ".venv" / "bin" / "python")

def venv_pip():
    if sys.platform == "win32":
        return str(BACKEND / ".venv" / "Scripts" / "pip.exe")
    return str(BACKEND / ".venv" / "bin" / "pip")

def main():
    print(f"{C}{'='*40}")
    print(f"  WORLD PULSE — Starting...")
    print(f"{'='*40}{R}")
    print()

    # 1. Check Python
    python = find_python()
    if not python:
        print(f"{Y}Python 3 not found. Install Python 3.10+{R}")
        sys.exit(1)

    # 2. Check Node/npm
    npm = find_npm()
    if not npm:
        print(f"{Y}npm not found. Install Node.js 18+{R}")
        sys.exit(1)

    # 3. Backend venv + deps
    print(f"{G}[1/4]{R} Setting up backend...")
    if not (BACKEND / ".venv").exists():
        run([python, "-m", "venv", str(BACKEND / ".venv")])
    run([venv_pip(), "install", "-q", "-r", str(BACKEND / "requirements.txt")])

    # 4. Seed database
    print(f"{G}[2/4]{R} Seeding database...")
    run([venv_python(), "seed.py"], cwd=BACKEND)

    # 5. Frontend deps
    print(f"{G}[3/4]{R} Installing frontend deps...")
    if not (FRONTEND / "node_modules").exists():
        run([npm, "install", "--silent"], cwd=FRONTEND)
    else:
        print("  node_modules exists, skipping npm install")

    # 6. Check .env
    if not (ROOT / ".env").exists():
        print(f"{Y}Warning: No .env file found. Copy .env.example and add your GEMINI_API_KEY{R}")
        print(f"{Y}  cp .env.example .env{R}")

    # 7. Start both servers
    print(f"{G}[4/4]{R} Launching servers...")
    print()
    print(f"  {C}Backend:{R}  http://localhost:8000")
    print(f"  {C}Frontend:{R} http://localhost:3000  <- open this")
    print()
    print(f"  Press {Y}Ctrl+C{R} to stop both")
    print()

    backend_proc = subprocess.Popen(
        [venv_python(), "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=BACKEND,
    )
    frontend_proc = subprocess.Popen(
        [npm, "run", "dev"],
        cwd=FRONTEND,
    )

    def cleanup(*_):
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait(timeout=5)
        frontend_proc.wait(timeout=5)
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, cleanup)

    try:
        while True:
            if backend_proc.poll() is not None or frontend_proc.poll() is not None:
                cleanup()
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
