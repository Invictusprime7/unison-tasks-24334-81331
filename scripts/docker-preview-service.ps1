<#
.SYNOPSIS
    Docker Preview Service Manager - Keeps the preview service always running

.DESCRIPTION
    Starts and monitors the Docker preview service, automatically restarting
    on failure. Can install as a Windows startup task.

.PARAMETER Start
    Start the preview service in the foreground

.PARAMETER Background
    Start the preview service in the background

.PARAMETER Stop
    Stop the preview service

.PARAMETER Status
    Check the status of the preview service

.PARAMETER Install
    Install as Windows startup task (runs on login)

.PARAMETER Uninstall
    Remove the Windows startup task

.EXAMPLE
    .\docker-preview-service.ps1 -Start
    .\docker-preview-service.ps1 -Background
    .\docker-preview-service.ps1 -Install
#>

param(
    [switch]$Start,
    [switch]$Background,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PreviewServiceDir = Join-Path $ProjectRoot "preview-service"
$TaskName = "UnisonPreviewService"

function Write-Color {
    param([string]$Color, [string]$Message)
    Write-Host $Message -ForegroundColor $Color
}

function Test-DockerRunning {
    try {
        $null = docker info 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-ServiceStatus {
    $gateway = docker ps --filter "name=preview-service-gateway" --format "{{.Status}}" 2>$null
    $worker = docker images "unison-preview-worker:latest" --format "{{.Repository}}" 2>$null
    
    return @{
        GatewayRunning = $gateway -match "Up"
        GatewayStatus = if ($gateway) { $gateway } else { "Not running" }
        WorkerImageExists = $worker -eq "unison-preview-worker"
    }
}

function Start-PreviewService {
    param([switch]$Detached)
    
    Write-Color Cyan "`n========================================="
    Write-Color Cyan "  Starting Docker Preview Service"
    Write-Color Cyan "=========================================`n"
    
    # Check Docker
    if (-not (Test-DockerRunning)) {
        Write-Color Yellow "Docker is not running. Starting Docker Desktop..."
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Minimized
        
        $maxWait = 120
        $waited = 0
        while (-not (Test-DockerRunning) -and $waited -lt $maxWait) {
            Start-Sleep -Seconds 2
            $waited += 2
            Write-Host "." -NoNewline
        }
        Write-Host ""
        
        if (-not (Test-DockerRunning)) {
            Write-Color Red "Failed to start Docker Desktop"
            return $false
        }
        Write-Color Green "Docker Desktop is ready"
    }
    
    Push-Location $PreviewServiceDir
    
    try {
        # Build and start
        Write-Color Yellow "Building preview service images..."
        docker-compose build --quiet
        
        if ($Detached) {
            Write-Color Yellow "Starting preview service (detached)..."
            docker-compose up -d
        } else {
            Write-Color Yellow "Starting preview service..."
            docker-compose up
        }
        
        Write-Color Green "`n✓ Preview service is running at http://localhost:3001"
        return $true
    } catch {
        Write-Color Red "Failed to start preview service: $_"
        return $false
    } finally {
        Pop-Location
    }
}

function Stop-PreviewService {
    Write-Color Yellow "Stopping preview service..."
    
    Push-Location $PreviewServiceDir
    try {
        docker-compose down
        Write-Color Green "✓ Preview service stopped"
    } catch {
        Write-Color Red "Error stopping service: $_"
    } finally {
        Pop-Location
    }
}

function Start-BackgroundMonitor {
    Write-Color Cyan "`n========================================="
    Write-Color Cyan "  Preview Service Monitor (Background)"
    Write-Color Cyan "=========================================`n"
    
    # Start detached first
    $result = Start-PreviewService -Detached
    if (-not $result) {
        return
    }
    
    Write-Color Yellow "Monitoring service health..."
    Write-Color Gray "(Press Ctrl+C to stop monitoring - service will keep running)"
    
    $checkInterval = 30  # seconds
    $restartAttempts = 0
    $maxRestarts = 5
    
    while ($true) {
        Start-Sleep -Seconds $checkInterval
        
        $status = Get-ServiceStatus
        
        if (-not $status.GatewayRunning) {
            Write-Color Yellow "[$(Get-Date -Format 'HH:mm:ss')] Gateway down, restarting..."
            
            $restartAttempts++
            if ($restartAttempts -ge $maxRestarts) {
                Write-Color Red "Too many restart attempts ($maxRestarts). Stopping monitor."
                break
            }
            
            Push-Location $PreviewServiceDir
            docker-compose up -d
            Pop-Location
            
            Write-Color Green "[$(Get-Date -Format 'HH:mm:ss')] Service restarted (attempt $restartAttempts/$maxRestarts)"
        } else {
            # Reset counter on successful health check
            $restartAttempts = 0
        }
    }
}

function Install-StartupTask {
    Write-Color Yellow "Installing Windows startup task..."
    
    $scriptPath = $MyInvocation.MyCommand.Path
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`" -Background"
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
    
    try {
        # Remove existing if present
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        
        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal
        Write-Color Green "✓ Startup task installed"
        Write-Color Gray "  The preview service will start automatically when you log in"
    } catch {
        Write-Color Red "Failed to install startup task: $_"
        Write-Color Yellow "Try running PowerShell as Administrator"
    }
}

function Uninstall-StartupTask {
    Write-Color Yellow "Removing Windows startup task..."
    
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Color Green "✓ Startup task removed"
    } catch {
        Write-Color Yellow "Startup task not found or already removed"
    }
}

function Show-Status {
    Write-Color Cyan "`n========================================="
    Write-Color Cyan "  Preview Service Status"
    Write-Color Cyan "=========================================`n"
    
    # Docker status
    if (Test-DockerRunning) {
        Write-Color Green "Docker:        Running"
    } else {
        Write-Color Red "Docker:        Not running"
        return
    }
    
    # Service status
    $status = Get-ServiceStatus
    
    if ($status.GatewayRunning) {
        Write-Color Green "Gateway:       $($status.GatewayStatus)"
    } else {
        Write-Color Red "Gateway:       $($status.GatewayStatus)"
    }
    
    if ($status.WorkerImageExists) {
        Write-Color Green "Worker Image:  Available"
    } else {
        Write-Color Yellow "Worker Image:  Not built"
    }
    
    # Startup task status
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Color Green "Startup Task:  Installed ($($task.State))"
    } else {
        Write-Color Gray "Startup Task:  Not installed"
    }
    
    # Test endpoint
    Write-Color Yellow "`nTesting gateway endpoint..."
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5 -ErrorAction Stop
        Write-Color Green "Health Check:  OK"
    } catch {
        Write-Color Red "Health Check:  Failed (service may be starting)"
    }
    
    Write-Host ""
}

function Show-Help {
    Write-Host @"

Docker Preview Service Manager
==============================

Usage: .\docker-preview-service.ps1 [options]

Options:
  -Start       Start the preview service (foreground)
  -Background  Start service + monitor in background
  -Stop        Stop the preview service
  -Status      Show service status
  -Install     Add to Windows startup (auto-start on login)
  -Uninstall   Remove from Windows startup
  -Help        Show this help

Examples:
  .\docker-preview-service.ps1 -Start
  .\docker-preview-service.ps1 -Background
  .\docker-preview-service.ps1 -Install
  .\docker-preview-service.ps1 -Status

"@
}

# Main
if ($Help -or (-not $Start -and -not $Background -and -not $Stop -and -not $Status -and -not $Install -and -not $Uninstall)) {
    Show-Help
}

if ($Status) { Show-Status }
if ($Install) { Install-StartupTask }
if ($Uninstall) { Uninstall-StartupTask }
if ($Stop) { Stop-PreviewService }
if ($Start) { Start-PreviewService }
if ($Background) { Start-BackgroundMonitor }
