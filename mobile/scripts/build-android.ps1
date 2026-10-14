$ErrorActionPreference = 'Stop'
$mobileRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$jdkParent = Join-Path $mobileRoot '../.tools/jdk17'
$jdk = Get-ChildItem -LiteralPath $jdkParent -Directory | Select-Object -First 1
if (!$jdk -or !(Test-Path (Join-Path $jdk.FullName 'bin/java.exe'))) { throw 'Install JDK 17 under .tools/jdk17, or run Expo with a configured Android SDK/JDK.' }
$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$env:NODE_ENV = 'development'
Set-Location (Join-Path $mobileRoot 'android')
./gradlew.bat :app:assembleDebug -x lint -x test --build-cache '-PreactNativeArchitectures=x86_64,arm64-v8a'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "APK: $mobileRoot/android/app/build/outputs/apk/debug/app-debug.apk"
