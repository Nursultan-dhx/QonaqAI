$ErrorActionPreference = 'Stop'

function Initialize-QonaqToolchain {
    param([Parameter(Mandatory = $true)][string]$ProjectRoot)
    $javaCandidates = @()
    if ($env:JAVA_HOME) { $javaCandidates += $env:JAVA_HOME }
    $javaCandidates += (Join-Path $ProjectRoot '.tools/jdk')
    $javaCandidates += @(Get-ChildItem -Path (Join-Path $env:USERPROFILE '.jdks/*21*') -Directory -ErrorAction SilentlyContinue | ForEach-Object FullName)
    foreach ($parent in @('C:/Program Files/Eclipse Adoptium', 'C:/Program Files/Microsoft', 'C:/Program Files/Java')) {
        $javaCandidates += @(Get-ChildItem -Path "$parent/*21*" -Directory -ErrorAction SilentlyContinue | ForEach-Object FullName)
    }
    $javacCommand = Get-Command javac.exe -ErrorAction SilentlyContinue
    if ($javacCommand) { $javaCandidates += (Split-Path (Split-Path $javacCommand.Source -Parent) -Parent) }
    $selectedJava = $null
    foreach ($candidate in ($javaCandidates | Select-Object -Unique)) {
        $compiler = Join-Path $candidate 'bin/javac.exe'
        if (Test-Path -LiteralPath $compiler) {
            $compilerVersion = (& $compiler -version 2>&1 | Out-String)
            if ($compilerVersion -match 'javac (\d+)' -and [int]$Matches[1] -ge 21) {
                $selectedJava = $candidate
                break
            }
        }
    }
    if (-not $selectedJava) { throw 'JDK 21+ не найден. Установите JDK 21 и задайте JAVA_HOME или положите JDK в .tools/jdk.' }
    $env:JAVA_HOME = $selectedJava
    $env:PATH = "$(Join-Path $selectedJava 'bin');$env:PATH"
    $mavenCandidates = @()
    $mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if ($mavenCommand) { $mavenCandidates += $mavenCommand.Source }
    $mavenCandidates += @(Get-ChildItem -Path (Join-Path $ProjectRoot '.tools/apache-maven-*/bin/mvn.cmd') -File -ErrorAction SilentlyContinue | ForEach-Object FullName)
    $wrapperRoot = Join-Path $env:USERPROFILE '.m2/wrapper/dists'
    if (Test-Path -LiteralPath $wrapperRoot) {
        $mavenCandidates += @(Get-ChildItem -LiteralPath $wrapperRoot -Filter mvn.cmd -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object FullName)
    }
    $script:QonaqMaven = $mavenCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $script:QonaqMaven) { throw 'Maven 3.9+ не найден. Установите Maven или распакуйте его в .tools/apache-maven-<версия>.' }
    $script:QonaqRepository = Join-Path $ProjectRoot '.tools/m2'
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) { throw 'Node.js и npm не найдены. Установите актуальную LTS-версию Node.js.' }
    $script:QonaqNpm = $npmCommand.Source
}

function Build-QonaqFrontend {
    param([Parameter(Mandatory = $true)][string]$ProjectRoot)
    Push-Location (Join-Path $ProjectRoot 'frontend')
    try {
        if (-not (Test-Path -LiteralPath 'node_modules')) {
            if (Test-Path -LiteralPath 'package-lock.json') { & $script:QonaqNpm ci } else { & $script:QonaqNpm install }
            if ($LASTEXITCODE -ne 0) { throw 'Не удалось установить зависимости интерфейса.' }
        }
        & $script:QonaqNpm run build
        if ($LASTEXITCODE -ne 0) { throw 'Сборка интерфейса завершилась ошибкой.' }
    } finally { Pop-Location }
}
