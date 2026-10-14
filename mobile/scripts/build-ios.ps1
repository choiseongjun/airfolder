$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'Snaproom - Apple Login - iOS Build'
Set-Location (Join-Path $PSScriptRoot '..')
$env:EAS_NO_VCS = '1'
Write-Host 'Snaproom iOS development build. Apple authentication is handled by Expo CLI.'
Write-Host 'Enter your Apple password only when Expo asks Password (for your Apple ID).'
Write-Host 'Never paste the password into the chat or at a PowerShell prompt.'
npx --yes eas-cli build --platform ios --profile development
