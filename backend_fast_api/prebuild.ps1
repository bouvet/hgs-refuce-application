# prebuild.ps1 — clean artifacts, set up env file, create/update venv and dependencies.
$ErrorActionPreference = 'Stop'

$Backend = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host '=== backend prebuild: cleaning artifacts ==='
Get-ChildItem -Path $Backend -Recurse -Include '__pycache__','*.egg-info','.pytest_cache' -Directory |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $Backend -Recurse -Include '*.pyc','*.pyo' |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host '=== backend prebuild: env setup ==='
$EnvFile    = Join-Path $Backend '.env'
$EnvExample = Join-Path $Backend '.env.example'
if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    Write-Host "  Created $EnvFile from $EnvExample - edit it if needed."
} else {
    Write-Host "  $EnvFile already exists, skipping."
}

Write-Host '=== backend prebuild: setting up venv ==='
$Venv = Join-Path $Backend '.venv'
if (-not (Test-Path $Venv)) {
    Write-Host '  Creating .venv...'
    python -m venv $Venv
}

$Pip = Join-Path $Venv 'Scripts\pip.exe'

Write-Host '=== backend prebuild: installing dependencies ==='
& $Pip install -q -r (Join-Path $Backend 'requirements.txt')

Write-Host '=== backend prebuild: done ==='
