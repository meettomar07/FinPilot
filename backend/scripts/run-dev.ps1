$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $backendRoot

$venvPython = Join-Path $backendRoot ".venv311/Scripts/python.exe"

if (-not (Test-Path $venvPython)) {
    throw "Missing .venv311. Run ./scripts/setup-venv311.ps1 first."
}

& $venvPython -m alembic upgrade head
& $venvPython -m uvicorn app.main:app --host 127.0.0.1 --port 8000
