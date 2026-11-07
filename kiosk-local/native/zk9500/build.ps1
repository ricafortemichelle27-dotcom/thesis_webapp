$ErrorActionPreference = 'Stop'

$nativeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent (Split-Path -Parent $nativeRoot)
$outputDirectory = Join-Path $nativeRoot 'bin'
$sourceFile = Join-Path $nativeRoot 'CaptureBridge.cs'
$defaultWrapper = Join-Path $env:LOCALAPPDATA 'Programs\ZK9500FingerprintManager\libzkfpcsharp.dll'
$wrapperPath = if ($env:ZK_SDK_WRAPPER_PATH) { $env:ZK_SDK_WRAPPER_PATH } else { $defaultWrapper }
$compilerCandidates = @(
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v3.5\csc.exe'),
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
)
$compilerPath = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not (Test-Path -LiteralPath $wrapperPath)) {
    throw 'Cannot find libzkfpcsharp.dll. Install the ZKFinger x86 SDK or set ZK_SDK_WRAPPER_PATH to its x86 wrapper DLL.'
}
if (-not $compilerPath) {
    throw 'The .NET Framework C# compiler is missing. Install the .NET Framework 3.5 developer tools.'
}

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$exePath = Join-Path $outputDirectory 'ZK9500Capture.exe'
$outputWrapper = Join-Path $outputDirectory 'libzkfpcsharp.dll'
Copy-Item -LiteralPath $wrapperPath -Destination $outputWrapper -Force

& $compilerPath /nologo /target:exe /platform:x86 /optimize+ "/out:$exePath" "/reference:$outputWrapper" $sourceFile
if ($LASTEXITCODE -ne 0) { throw "ZK9500 capture helper compilation failed with exit code $LASTEXITCODE." }

Write-Output "Built $exePath"
