$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $backendRoot

$venvPython = Join-Path $backendRoot ".venv311/Scripts/python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python 3.11 virtual environment (.venv311)..."
    py -3.11 -m venv .venv311
}

Write-Host "Installing backend dependencies into .venv311..."
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -e ".[dev]"

Write-Host "Applying database migrations..."
& $venvPython -m alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Warning "alembic upgrade head failed. Attempting alembic stamp head for existing schema."
    & $venvPython -m alembic stamp head
    if ($LASTEXITCODE -ne 0) {
        throw "Migration setup failed. Please inspect backend/alembic.ini and backend/data/finpilot.db state."
    }
}

Write-Host "Backend setup complete."
