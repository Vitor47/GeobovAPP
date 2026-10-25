# Builds a signed release APK pointed at the GeoBov production API.
# Keystore and passwords stay outside the repository.
#
#   keytool -genkeypair -v -keystore "$env:USERPROFILE\.geobov\upload.jks" -alias geobov -keyalg RSA -keysize 2048 -validity 10000
#
#   $env:GEOBOV_KEYSTORE_PATH = "$env:USERPROFILE\.geobov\upload.jks"
#   $env:GEOBOV_KEYSTORE_PASSWORD = "..."
#   $env:GEOBOV_KEY_ALIAS = "geobov"
#   $env:GEOBOV_KEY_PASSWORD = "..."
#   npm run build:android:release

$ErrorActionPreference = "Stop"

$required = @(
  "GEOBOV_KEYSTORE_PATH",
  "GEOBOV_KEYSTORE_PASSWORD",
  "GEOBOV_KEY_ALIAS",
  "GEOBOV_KEY_PASSWORD"
)

foreach ($name in $required) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Defina $name. A senha e o keystore ficam fora do repositório."
  }
}

$keystorePath = $env:GEOBOV_KEYSTORE_PATH
if (-not (Test-Path -LiteralPath $keystorePath)) {
  throw "Keystore não encontrado em $keystorePath"
}

New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot "..\dist") | Out-Null

ns build android --release --env.production --copy-to (Join-Path $PSScriptRoot "..\dist") `
  --key-store-path $keystorePath `
  --key-store-password $env:GEOBOV_KEYSTORE_PASSWORD `
  --key-store-alias $env:GEOBOV_KEY_ALIAS `
  --key-store-alias-password $env:GEOBOV_KEY_PASSWORD

if ($LASTEXITCODE -ne 0) {
  throw "Build Android falhou (exit $LASTEXITCODE)."
}

Write-Host ""
Write-Host "APK de release copiado para dist\ (API https://54.94.137.227)."
