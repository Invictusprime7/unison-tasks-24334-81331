# Test Supabase Function Connectivity
# =====================================
# Quick script to test if fullstack-ai function is accessible
# Run with: .\test-function.ps1

$SUPABASE_URL = "https://nfrdomdvyrbwuokathtw.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcmRvbWR2eXJid3Vva2F0aHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5ODA2ODksImV4cCI6MjA1MDU1NjY4OX0.hXIS9fZcCl7IJ3j69L-vA0yAzZBWMCZqPtPqD1z2HnY"

Write-Host "Testing fullstack-ai function...`n" -ForegroundColor Cyan

$url = "$SUPABASE_URL/functions/v1/fullstack-ai"
Write-Host "URL: $url" -ForegroundColor Gray
Write-Host "Testing connection...`n" -ForegroundColor Gray

$body = @{
    messages = @(
        @{
            role = "user"
            content = "Generate a simple HTML button"
        }
    )
    mode = "html"
    model = "gpt-4o-mini"
    maxTokens = 100
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $SUPABASE_KEY"
    } -Body $body -ErrorAction Stop
    
    Write-Host "Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Yellow
    
    $json = $response.Content | ConvertFrom-Json
    Write-Host ($json | ConvertTo-Json -Depth 10)
    
    if ($json.error) {
        Write-Host "`n❌ ERROR: $($json.error)" -ForegroundColor Red
        Write-Host "Message: $($json.message)" -ForegroundColor Red
    } elseif ($json.html -or $json.content -or $json.code) {
        Write-Host "`n✅ SUCCESS! Function is working." -ForegroundColor Green
        Write-Host "Generated content length: $($json.html.Length + $json.content.Length + $json.code.Length) characters" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ Unexpected response format" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ FAILED TO CONNECT:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    Write-Host "`nPossible causes:" -ForegroundColor Yellow
    Write-Host "1. Function not deployed - run: supabase functions deploy fullstack-ai" -ForegroundColor Gray
    Write-Host "2. Internet connection issues" -ForegroundColor Gray
    Write-Host "3. Supabase project is offline" -ForegroundColor Gray
    Write-Host "4. CORS or network restrictions" -ForegroundColor Gray
    Write-Host "5. API key not set - run: supabase secrets set LOVABLE_API_KEY=your_key" -ForegroundColor Gray
    
    Write-Host "`nTo check function status:" -ForegroundColor Cyan
    Write-Host "  supabase functions list" -ForegroundColor Gray
    Write-Host "`nTo deploy function:" -ForegroundColor Cyan
    Write-Host "  supabase functions deploy fullstack-ai" -ForegroundColor Gray
    Write-Host "`nTo check logs:" -ForegroundColor Cyan
    Write-Host "  supabase functions logs fullstack-ai" -ForegroundColor Gray
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
