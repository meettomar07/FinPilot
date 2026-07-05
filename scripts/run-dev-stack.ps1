$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "backend"
$backendPython = Join-Path $backendRoot ".venv311\Scripts\python.exe"
$backendEnvPath = Join-Path $backendRoot ".env"
$backendUrl = "http://127.0.0.1:8000/healthz"
$frontendUrl = "http://127.0.0.1:5173"

if (-not (Test-Path $backendPython)) {
    throw "Missing backend/.venv311. Run npm run setup:backend first."
}

if (-not (Test-Path $backendEnvPath)) {
    Copy-Item -LiteralPath (Join-Path $backendRoot ".env.example") -Destination $backendEnvPath
    Write-Host "Created backend/.env from .env.example"
}

& $backendPython -m alembic upgrade head

try {
    $backendHealth = Invoke-WebRequest -UseBasicParsing $backendUrl
    if ($backendHealth.StatusCode -eq 200) {
        Write-Host "Backend already running on http://127.0.0.1:8000"
    }
} catch {
    Write-Host "Starting backend on http://127.0.0.1:8000 ..."
    Start-Process -FilePath $backendPython `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" `
        -WorkingDirectory $backendRoot `
        -WindowStyle Hidden | Out-Null

    Start-Sleep -Seconds 2

    try {
        $backendHealth = Invoke-WebRequest -UseBasicParsing $backendUrl
        if ($backendHealth.StatusCode -ne 200) {
            throw "Backend health check returned status $($backendHealth.StatusCode)."
        }
    } catch {
        throw "Backend did not become healthy on http://127.0.0.1:8000. $($_.Exception.Message)"
    }
}

try {
    $frontendHealth = Invoke-WebRequest -UseBasicParsing $frontendUrl
    if ($frontendHealth.StatusCode -eq 200) {
        Write-Host "Frontend already running on http://127.0.0.1:5173"
        return
    }
} catch {
    Write-Host "Starting frontend on http://127.0.0.1:5173 ..."
    npm run dev:frontend
}
