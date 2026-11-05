<#
.SYNOPSIS
    Baigamats Swift Android Build Script for PowerShell
.DESCRIPTION
    Builds APKs and Android App Bundles (AAB) for Sacco and Horeca flavors.
.PARAMETER App
    Target app flavor: 'sacco', 'horeca', or 'all' (default: 'horeca')
.PARAMETER Env
    Target environment: 'dev', 'staging', or 'prod' (default: 'prod')
.PARAMETER Type
    Target artifact type: 'apk', 'bundle' (or 'aab'), or 'all' (default: 'apk')
.PARAMETER Clean
    Whether to clean previous build artifacts before building
.EXAMPLE
    .\scripts\build.ps1 -App horeca -Env prod -Type apk
    .\scripts\build.ps1 -App sacco -Env prod -Type bundle
    .\scripts\build.ps1 -App all -Type apk -Clean
#>
param(
    [ValidateSet("sacco", "horeca", "all")]
    [string]$App = "horeca",

    [ValidateSet("dev", "staging", "prod")]
    [string]$Env = "prod",

    [ValidateSet("apk", "bundle", "aab", "all")]
    [string]$Type = "apk",

    [switch]$Clean
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

$nodeArgs = @("$scriptDir\build-android.js", "--app", $App, "--env", $Env, "--type", $Type)
if ($Clean) {
    $nodeArgs += "--clean"
}

node @nodeArgs
exit $LASTEXITCODE
