$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
. (Join-Path $projectRoot 'scripts/toolchain.ps1')
Initialize-QonaqToolchain -ProjectRoot $projectRoot
Build-QonaqFrontend -ProjectRoot $projectRoot
$displayPort = if ([string]::IsNullOrWhiteSpace($env:PORT)) { '8080' } else { $env:PORT }
Write-Host "QonaqAI: http://localhost:$displayPort  |  Остановка: Ctrl+C" -ForegroundColor Green
Push-Location (Join-Path $projectRoot 'backend')
try {
    & $script:QonaqMaven --batch-mode "-Dmaven.repo.local=$script:QonaqRepository" spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw 'Сервер завершился с ошибкой.' }
} finally { Pop-Location }
