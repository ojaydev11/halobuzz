# HaloBuzz Hosted Smoke Test Script (PowerShell)
# Usage: $env:BACKEND_URL="<url>"; $env:AI_URL="<url>"; $env:AI_ENGINE_SECRET="<secret>"; .\scripts\hosted-smoke.ps1

param(
    [string]$BackendUrl = $env:BACKEND_URL,
    [string]$AiUrl = $env:AI_URL,
    [string]$AiEngineSecret = $env:AI_ENGINE_SECRET
)

# Check required parameters
if (-not $BackendUrl -or -not $AiUrl -or -not $AiEngineSecret) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    Write-Host "BACKEND_URL=$BackendUrl"
    Write-Host "AI_URL=$AiUrl"
    Write-Host "AI_ENGINE_SECRET=$($AiEngineSecret.Substring(0, [Math]::Min(8, $AiEngineSecret.Length)))..."
    Write-Host ""
    Write-Host "Usage: `$env:BACKEND_URL='<url>'; `$env:AI_URL='<url>'; `$env:AI_ENGINE_SECRET='<secret>'; .\scripts\hosted-smoke.ps1"
    exit 1
}

Write-Host "🚀 Starting HaloBuzz Hosted Smoke Tests" -ForegroundColor Green
Write-Host "Backend: $BackendUrl"
Write-Host "AI Engine: $AiUrl"
Write-Host ""

# Initialize results
$ResultsFile = "SMOKE_RESULTS.md"
@"
# HaloBuzz Hosted Smoke Test Results

**Test Date:** $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
**Backend URL:** $BackendUrl
**AI URL:** $AiUrl

## Test Results

"@ | Out-File -FilePath $ResultsFile -Encoding UTF8

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Data = $null,
        [int]$ExpectedCode = 200
    )
    
    Write-Host "Testing $Name..." -ForegroundColor Yellow
    
    try {
        $requestParams = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ErrorAction = 'Stop'
        }
        
        if ($Data) {
            $requestParams.Body = $Data
            $requestParams.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @requestParams
        $statusCode = 200
        
        Write-Host "✅ $Name`: PASSED (HTTP $statusCode)" -ForegroundColor Green
        "✅ **$Name**: PASSED (HTTP $statusCode)" | Add-Content -Path $ResultsFile -Encoding UTF8
        return $true
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ $Name`: FAILED (HTTP $statusCode)" -ForegroundColor Red
        "❌ **$Name**: FAILED (HTTP $statusCode)" | Add-Content -Path $ResultsFile -Encoding UTF8
        return $false
    }
}

# 1. Backend Health Check
"### 1. Backend Health Check" | Add-Content -Path $ResultsFile -Encoding UTF8
"" | Add-Content -Path $ResultsFile -Encoding UTF8
Test-Endpoint -Name "Backend Health" -Url "$BackendUrl/healthz"
"" | Add-Content -Path $ResultsFile -Encoding UTF8

# 2. AI Engine Health Check
"### 2. AI Engine Health Check" | Add-Content -Path $ResultsFile -Encoding UTF8
"" | Add-Content -Path $ResultsFile -Encoding UTF8
Test-Endpoint -Name "AI Engine Health" -Url "$AiUrl/healthz"
"" | Add-Content -Path $ResultsFile -Encoding UTF8

# 3. Authentication Flow
"### 3. Authentication Flow" | Add-Content -Path $ResultsFile -Encoding UTF8
"" | Add-Content -Path $ResultsFile -Encoding UTF8

# Register (idempotent)
$registerData = '{"email":"test@hb.com","password":"StrongP@ss1","username":"smoketest"}'
Test-Endpoint -Name "Register" -Url "$BackendUrl/auth/register" -Method "POST" -Data $registerData

# Login
$loginData = '{"email":"test@hb.com","password":"StrongP@ss1"}'
try {
    $loginResponse = Invoke-RestMethod -Uri "$BackendUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.accessToken
    
    if ($token) {
        Write-Host "✅ Login: PASSED" -ForegroundColor Green
        "✅ **Login**: PASSED" | Add-Content -Path $ResultsFile -Encoding UTF8
    } else {
        Write-Host "❌ Login: FAILED (no token)" -ForegroundColor Red
        "❌ **Login**: FAILED (no token)" | Add-Content -Path $ResultsFile -Encoding UTF8
        $token = $null
    }
} catch {
    Write-Host "❌ Login: FAILED" -ForegroundColor Red
    "❌ **Login**: FAILED" | Add-Content -Path $ResultsFile -Encoding UTF8
    $token = $null
}
"" | Add-Content -Path $ResultsFile -Encoding UTF8

# 4. Core API Tests (if authenticated)
if ($token) {
    "### 4. Core API Tests" | Add-Content -Path $ResultsFile -Encoding UTF8
    "" | Add-Content -Path $ResultsFile -Encoding UTF8
    
    $authHeaders = @{ "Authorization" = "Bearer $token" }
    
    # OG Tiers
    Test-Endpoint -Name "OG Tiers" -Url "$BackendUrl/og/tiers" -Headers $authHeaders
    
    # Dev Credit
    $creditData = '{"coins":10000}'
    Test-Endpoint -Name "Dev Credit" -Url "$BackendUrl/wallet/dev/credit" -Method "POST" -Headers $authHeaders -Data $creditData
    
    "" | Add-Content -Path $ResultsFile -Encoding UTF8
    
    # 5. Stream and Gift Flow
    "### 5. Stream and Gift Flow" | Add-Content -Path $ResultsFile -Encoding UTF8
    "" | Add-Content -Path $ResultsFile -Encoding UTF8
    
    # Create stream
    $streamData = '{"mode":"video","title":"Smoke Test Stream","isAnonymous":false}'
    try {
        $streamResponse = Invoke-RestMethod -Uri "$BackendUrl/streams" -Method POST -Headers $authHeaders -Body $streamData -ContentType "application/json"
        $streamId = $streamResponse._id
        
        if ($streamId) {
            Write-Host "✅ Create Stream: PASSED" -ForegroundColor Green
            "✅ **Create Stream**: PASSED" | Add-Content -Path $ResultsFile -Encoding UTF8
            "**Stream ID**: $streamId" | Add-Content -Path $ResultsFile -Encoding UTF8
            
            # Get gifts
            try {
                $giftsResponse = Invoke-RestMethod -Uri "$BackendUrl/gifts?active=true"
                $giftId = $giftsResponse[0]._id
                
                if ($giftId) {
                    Write-Host "✅ Get Gifts: PASSED" -ForegroundColor Green
                    "✅ **Get Gifts**: PASSED" | Add-Content -Path $ResultsFile -Encoding UTF8
                    
                    # Send gift
                    $giftSendData = "{\"giftId\":\"$giftId\",\"qty\":1}"
                    Test-Endpoint -Name "Send Gift" -Url "$BackendUrl/streams/$streamId/gift" -Method "POST" -Headers $authHeaders -Data $giftSendData
                } else {
                    Write-Host "❌ Get Gifts: FAILED (no gift ID)" -ForegroundColor Red
                    "❌ **Get Gifts**: FAILED (no gift ID)" | Add-Content -Path $ResultsFile -Encoding UTF8
                }
            } catch {
                Write-Host "❌ Get Gifts: FAILED" -ForegroundColor Red
                "❌ **Get Gifts**: FAILED" | Add-Content -Path $ResultsFile -Encoding UTF8
            }
        } else {
            Write-Host "❌ Create Stream: FAILED (no stream ID)" -ForegroundColor Red
            "❌ **Create Stream**: FAILED (no stream ID)" | Add-Content -Path $ResultsFile -Encoding UTF8
        }
    } catch {
        Write-Host "❌ Create Stream: FAILED" -ForegroundColor Red
        "❌ **Create Stream**: FAILED" | Add-Content -Path $ResultsFile -Encoding UTF8
    }
    "" | Add-Content -Path $ResultsFile -Encoding UTF8
    
    # 6. AI Engine Security Tests
    if ($streamId) {
        "### 6. AI Engine Security Tests" | Add-Content -Path $ResultsFile -Encoding UTF8
        "" | Add-Content -Path $ResultsFile -Encoding UTF8
        
        # Test without x-ai-secret (should fail)
        try {
            $aiNoSecretResponse = Invoke-RestMethod -Uri "$AiUrl/internal/engagement/battle-boost" -Method POST -Body "{\"streamId\":\"$streamId\",\"multiplier\":2,\"durationSec\":60}" -ContentType "application/json"
            Write-Host "❌ AI No Secret Test: FAILED (should have been rejected)" -ForegroundColor Red
            "❌ **AI No Secret Test**: FAILED (should have been rejected)" | Add-Content -Path $ResultsFile -Encoding UTF8
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 401 -or $statusCode -eq 403) {
                Write-Host "✅ AI No Secret Test: PASSED (HTTP $statusCode - correctly rejected)" -ForegroundColor Green
                "✅ **AI No Secret Test**: PASSED (HTTP $statusCode - correctly rejected)" | Add-Content -Path $ResultsFile -Encoding UTF8
            } else {
                Write-Host "❌ AI No Secret Test: FAILED (HTTP $statusCode - should be 401/403)" -ForegroundColor Red
                "❌ **AI No Secret Test**: FAILED (HTTP $statusCode - should be 401/403)" | Add-Content -Path $ResultsFile -Encoding UTF8
            }
        }
        
        # Test with x-ai-secret (should succeed)
        $aiHeaders = @{ "x-ai-secret" = $AiEngineSecret }
        try {
            $aiWithSecretResponse = Invoke-RestMethod -Uri "$AiUrl/internal/engagement/battle-boost" -Method POST -Headers $aiHeaders -Body "{\"streamId\":\"$streamId\",\"multiplier\":2,\"durationSec\":60}" -ContentType "application/json"
            Write-Host "✅ AI With Secret Test: PASSED" -ForegroundColor Green
            "✅ **AI With Secret Test**: PASSED" | Add-Content -Path $ResultsFile -Encoding UTF8
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "❌ AI With Secret Test: FAILED (HTTP $statusCode)" -ForegroundColor Red
            "❌ **AI With Secret Test**: FAILED (HTTP $statusCode)" | Add-Content -Path $ResultsFile -Encoding UTF8
        }
        "" | Add-Content -Path $ResultsFile -Encoding UTF8
    }
} else {
    "### 4-6. Core API Tests: SKIPPED (no auth token)" | Add-Content -Path $ResultsFile -Encoding UTF8
    "" | Add-Content -Path $ResultsFile -Encoding UTF8
}

# Finalize results
@"

## Summary

**Test completed at:** $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")

Check individual test results above for detailed status.
"@ | Add-Content -Path $ResultsFile -Encoding UTF8

Write-Host ""
Write-Host "🎉 Smoke tests completed! Results saved to $ResultsFile" -ForegroundColor Green
Write-Host ""
Write-Host "To view results:"
Write-Host "Get-Content $ResultsFile"
