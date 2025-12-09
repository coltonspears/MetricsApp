# MetricsApp Plugin Deployment Script
# Run this after building to deploy plugins to the API output folder

param(
    [string]$Configuration = "Debug",
    [string]$TargetFramework = "net9.0"
)

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot
$apiOutputDir = Join-Path $rootDir "MetricsApp.Api\bin\$Configuration\$TargetFramework"
$pluginsDir = Join-Path $apiOutputDir "Plugins"

Write-Host "MetricsApp Plugin Deployment" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Configuration: $Configuration"
Write-Host "Target Framework: $TargetFramework"
Write-Host "API Output: $apiOutputDir"
Write-Host "Plugins Dir: $pluginsDir"
Write-Host ""

# Clean up old plugins folder
if (Test-Path $pluginsDir) {
    Write-Host "Cleaning old Plugins folder..." -ForegroundColor Yellow
    Remove-Item -Path $pluginsDir -Recurse -Force
}

# Create fresh plugins directory
New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
Write-Host "Created Plugins folder" -ForegroundColor Green

# Deploy InitialSetupPlugin
$initialSetupSource = Join-Path $rootDir "InitialSetupPlugin\bin\$Configuration\$TargetFramework"
$initialSetupDest = Join-Path $pluginsDir "initial-setup-plugin"

if (Test-Path $initialSetupSource) {
    Write-Host "Deploying InitialSetupPlugin..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $initialSetupDest -Force | Out-Null
    
    $filesToCopy = @("InitialSetupPlugin.dll", "InitialSetupPlugin.pdb", "manifest.json", "schema.sql")
    foreach ($file in $filesToCopy) {
        $sourcePath = Join-Path $initialSetupSource $file
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath $initialSetupDest -Force
            Write-Host "  Copied: $file" -ForegroundColor Gray
        }
    }
    Write-Host "  InitialSetupPlugin deployed!" -ForegroundColor Green
} else {
    Write-Host "  InitialSetupPlugin not found at: $initialSetupSource" -ForegroundColor Red
    Write-Host "  Run: dotnet build InitialSetupPlugin" -ForegroundColor Yellow
}

# Deploy SqlServerPlugin
$sqlServerSource = Join-Path $rootDir "SqlServerPlugin\bin\$Configuration\$TargetFramework"
$sqlServerDest = Join-Path $pluginsDir "sqlserver-plugin"

if (Test-Path $sqlServerSource) {
    Write-Host "Deploying SqlServerPlugin..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $sqlServerDest -Force | Out-Null
    
    $filesToCopy = @("SqlServerPlugin.dll", "SqlServerPlugin.pdb", "manifest.json")
    foreach ($file in $filesToCopy) {
        $sourcePath = Join-Path $sqlServerSource $file
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath $sqlServerDest -Force
            Write-Host "  Copied: $file" -ForegroundColor Gray
        }
    }
    Write-Host "  SqlServerPlugin deployed!" -ForegroundColor Green
} else {
    Write-Host "  SqlServerPlugin not found at: $sqlServerSource" -ForegroundColor Red
    Write-Host "  Run: dotnet build SqlServerPlugin" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Plugins folder contents:" -ForegroundColor Cyan
Get-ChildItem -Path $pluginsDir -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($pluginsDir.Length + 1)
    if ($_.PSIsContainer) {
        Write-Host "  [DIR] $relativePath" -ForegroundColor Blue
    } else {
        Write-Host "  $relativePath" -ForegroundColor Gray
    }
}

