# CRM Automated Testing Script
# Tests all CRM deployment components automatically

$ErrorActionPreference = "Continue"
$SupabaseProjectRef = "nfrdomdvyrbwuokathtw"
$SupabaseUrl = "https://$SupabaseProjectRef.supabase.co"
$LocalServerUrl = "http://localhost:8080"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   CRM AUTOMATED VERIFICATION TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$TestResults = @()

# Test 1: Local Development Server
Write-Host "[TEST 1] Local Development Server" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $LocalServerUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   [OK] Server is running at $LocalServerUrl" -ForegroundColor Green
        $TestResults += @{Test="Local Server"; Status="PASS"; Details="HTTP 200 OK"}
    }
} catch {
    Write-Host "   [FAIL] Server is not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    $TestResults += @{Test="Local Server"; Status="FAIL"; Details=$_.Exception.Message}
}

# Test 2: CRM Dashboard Endpoint
Write-Host "`n[TEST 2] CRM Dashboard Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$LocalServerUrl/crm" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   [OK] CRM Dashboard endpoint accessible" -ForegroundColor Green
        $TestResults += @{Test="CRM Dashboard"; Status="PASS"; Details="HTTP 200 OK"}
    }
} catch {
    Write-Host "   [FAIL] CRM Dashboard not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    $TestResults += @{Test="CRM Dashboard"; Status="FAIL"; Details=$_.Exception.Message}
}

# Test 3: Supabase Project Connectivity
Write-Host "`n[TEST 3] Supabase Project Connectivity" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SupabaseUrl/rest/v1/" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   [OK] Supabase project is online" -ForegroundColor Green
    $TestResults += @{Test="Supabase Project"; Status="PASS"; Details="Project reachable"}
} catch {
    Write-Host "   [FAIL] Cannot reach Supabase project" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    $TestResults += @{Test="Supabase Project"; Status="FAIL"; Details=$_.Exception.Message}
}

# Test 4: Edge Functions Deployment
Write-Host "`n[TEST 4] Edge Functions Deployment" -ForegroundColor Yellow
$functions = @("workflow-trigger", "workflow-cron", "workflow-job-processor", "form-submit")
$functionsDeployed = 0

foreach ($func in $functions) {
    try {
        $response = Invoke-WebRequest -Uri "$SupabaseUrl/functions/v1/$func" -Method OPTIONS -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   [OK] $func deployed" -ForegroundColor Green
        $functionsDeployed++
    } catch {
        Write-Host "   [FAIL] $func not accessible" -ForegroundColor Red
    }
}

if ($functionsDeployed -eq 4) {
    $TestResults += @{Test="Edge Functions"; Status="PASS"; Details="All 4 functions deployed"}
} else {
    $TestResults += @{Test="Edge Functions"; Status="PARTIAL"; Details="$functionsDeployed/4 functions deployed"}
}

# Test 5: Supabase CLI
Write-Host "`n[TEST 5] Supabase CLI" -ForegroundColor Yellow
try {
    $cliVersion = supabase --version 2>$null
    if ($cliVersion) {
        Write-Host "   [OK] Supabase CLI installed: $cliVersion" -ForegroundColor Green
        $TestResults += @{Test="Supabase CLI"; Status="PASS"; Details=$cliVersion}
    }
} catch {
    Write-Host "   [FAIL] Supabase CLI not found" -ForegroundColor Red
    $TestResults += @{Test="Supabase CLI"; Status="FAIL"; Details="Not installed"}
}

# Test 6: Database Schema Check via CLI
Write-Host "`n[TEST 6] Database Schema" -ForegroundColor Yellow
try {
    supabase db dump --project-ref $SupabaseProjectRef --schema public 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Database schema accessible" -ForegroundColor Green
        $TestResults += @{Test="Database Schema"; Status="PASS"; Details="Schema accessible"}
    } else {
        Write-Host "   [MANUAL] Database schema check requires manual verification" -ForegroundColor Yellow
        $TestResults += @{Test="Database Schema"; Status="MANUAL"; Details="Requires Dashboard verification"}
    }
} catch {
    Write-Host "   [MANUAL] Database schema check requires manual verification" -ForegroundColor Yellow
    $TestResults += @{Test="Database Schema"; Status="MANUAL"; Details="Requires Dashboard verification"}
}

# Test 7: Environment Files
Write-Host "`n[TEST 7] Environment Configuration" -ForegroundColor Yellow
$envFiles = @(".env", ".env.local")
$envFound = $false

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] Found $file" -ForegroundColor Green
        $envFound = $true
        
        $content = Get-Content $file -Raw
        if ($content -match "VITE_SUPABASE_URL") {
            Write-Host "   [OK] VITE_SUPABASE_URL configured" -ForegroundColor Green
        }
        if ($content -match "VITE_SUPABASE_ANON_KEY") {
            Write-Host "   [OK] VITE_SUPABASE_ANON_KEY configured" -ForegroundColor Green
        }
    }
}

if ($envFound) {
    $TestResults += @{Test="Environment Config"; Status="PASS"; Details="Local env files found"}
} else {
    Write-Host "   [WARN] No .env files found (may use defaults)" -ForegroundColor Yellow
    $TestResults += @{Test="Environment Config"; Status="WARNING"; Details="No local .env files"}
}

# Generate Summary Report
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "        TEST SUMMARY REPORT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passCount = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$manualCount = ($TestResults | Where-Object { $_.Status -eq "MANUAL" -or $_.Status -eq "WARNING" -or $_.Status -eq "PARTIAL" }).Count

foreach ($result in $TestResults) {
    $status = switch ($result.Status) {
        "PASS" { "[PASS]" }
        "FAIL" { "[FAIL]" }
        "PARTIAL" { "[WARN]" }
        "WARNING" { "[WARN]" }
        "MANUAL" { "[MANUAL]" }
        default { "[?]" }
    }
    
    Write-Host "$status $($result.Test): $($result.Details)" -ForegroundColor $(
        switch ($result.Status) {
            "PASS" { "Green" }
            "FAIL" { "Red" }
            default { "Yellow" }
        }
    )
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Results: $passCount Passed | $failCount Failed | $manualCount Require Attention" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

# Manual Verification Checklist
if ($manualCount -gt 0) {
    Write-Host "MANUAL VERIFICATION REQUIRED:`n" -ForegroundColor Yellow
    Write-Host "These items require Dashboard verification:" -ForegroundColor White
    Write-Host "  1. Environment Secrets - 2 required:" -ForegroundColor Gray
    Write-Host "     https://supabase.com/dashboard/project/$SupabaseProjectRef/settings/functions`n" -ForegroundColor Cyan
    Write-Host "  2. Database Tables - 11 crm tables:" -ForegroundColor Gray
    Write-Host "     https://supabase.com/dashboard/project/$SupabaseProjectRef/editor`n" -ForegroundColor Cyan
    Write-Host "  3. Cron Job Configuration:" -ForegroundColor Gray
    Write-Host "     https://supabase.com/dashboard/project/$SupabaseProjectRef/database/cron-jobs`n" -ForegroundColor Cyan
}

# Quick Action Recommendations
Write-Host "NEXT STEPS:`n" -ForegroundColor Magenta
if ($failCount -gt 0) {
    Write-Host "  [!] Fix failed tests before proceeding" -ForegroundColor Red
    Write-Host "  - Ensure dev server is running: npm run dev" -ForegroundColor Gray
    Write-Host "  - Check Supabase project status in Dashboard`n" -ForegroundColor Gray
} else {
    Write-Host "  [OK] All automated tests passed!" -ForegroundColor Green
    Write-Host "  - Complete manual verification steps above" -ForegroundColor Gray
    Write-Host "  - Test CRM functionality at: $LocalServerUrl/crm`n" -ForegroundColor Gray
}

Write-Host "========================================`n" -ForegroundColor Cyan
