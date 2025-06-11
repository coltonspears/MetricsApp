# MetricsApp Development Startup Script
Write-Host "Starting MetricsApp Development Environment..." -ForegroundColor Green

# Function to start a process in a new window
function Start-ProcessInNewWindow {
    param(
        [string]$ProcessPath,
        [string]$ArgumentList,
        [string]$WorkingDirectory,
        [string]$Title
    )
    
    Write-Host "Starting $Title..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDirectory'; $ProcessPath $ArgumentList; Write-Host '$Title process finished'" -WindowStyle Normal
}

# Start Backend API
Start-ProcessInNewWindow -ProcessPath "dotnet" -ArgumentList "run" -WorkingDirectory ".\MetricsApp.Api" -Title "Backend API"

# Wait a moment for API to start
Start-Sleep -Seconds 3

# Start Frontend
Start-ProcessInNewWindow -ProcessPath "npm" -ArgumentList "run dev" -WorkingDirectory ".\MetricsApp.WebUI" -Title "Frontend"

Write-Host ""
Write-Host "Development servers are starting..." -ForegroundColor Green
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 