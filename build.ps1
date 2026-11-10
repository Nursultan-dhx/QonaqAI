$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
. (Join-Path $projectRoot 'scripts/toolchain.ps1')
Initialize-QonaqToolchain -ProjectRoot $projectRoot
Build-QonaqFrontend -ProjectRoot $projectRoot
Push-Location (Join-Path $projectRoot 'backend')
try {
    & $script:QonaqMaven --batch-mode "-Dmaven.repo.local=$script:QonaqRepository" clean package
    if ($LASTEXITCODE -ne 0) { throw 'Сборка или тесты сервера завершились ошибкой.' }
    Write-Host 'Сборка и тесты завершены. JAR находится в backend/target.' -ForegroundColor Green
} finally { Pop-Location }
