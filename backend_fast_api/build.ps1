# build.ps1 — run prebuild, then test and verify the backend.
$ErrorActionPreference = "Stop"

$Backend = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== backend build: running prebuild ==="
& "$Backend\prebuild.ps1"

Write-Host "=== backend build: clearing build artifacts ==="
Get-ChildItem -Path $Backend -Recurse -Include "__pycache__","*.egg-info",".pytest_cache" -Directory |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $Backend -Recurse -Include "*.pyc","*.pyo" |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "=== backend build: running tests ==="
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$Env:PYTHONPATH = Join-Path $Backend "src"
Push-Location $Backend
& $Python -m pytest
Pop-Location

Write-Host "=== backend build: verifying imports ==="
& $Python -c "from hgs_refuce_app.main import app; print('  Backend imports OK')"

Write-Host "=== backend build: done ==="
