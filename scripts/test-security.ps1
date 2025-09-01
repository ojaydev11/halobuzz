# HaloBuzz Security Test Runner (PowerShell)
# Runs comprehensive security tests across all services

param(
    [switch]$Quick,
    [switch]$LintOnly,
    [switch]$Help
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Test results tracking
$TotalTests = 0
$PassedTests = 0
$FailedTests = 0

function Write-ColorText {
    param($Text, $Color)
    Write-Host $Text -ForegroundColor $Colors[$Color]
}

function Run-TestSuite {
    param($Service, $TestCommand, $Description)
    
    Write-Host ""
    Write-ColorText "Testing ${Service}: ${Description}" "Blue"
    Write-Host "----------------------------------------"
    
    if (Test-Path $Service) {
        Push-Location $Service
        
        try {
            Invoke-Expression $TestCommand
            Write-ColorText "✅ ${Service} security tests PASSED" "Green"
            $script:PassedTests++
        }
        catch {
            Write-ColorText "❌ ${Service} security tests FAILED" "Red"
            Write-ColorText "Error: $($_.Exception.Message)" "Red"
            $script:FailedTests++
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-ColorText "⚠️ ${Service} directory not found" "Yellow"
    }
    
    $script:TotalTests++
}

function Test-Prerequisites {
    Write-Host "Checking prerequisites..."
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version
        Write-ColorText "✅ Node.js version: $nodeVersion" "Green"
    }
    catch {
        Write-ColorText "❌ Node.js is not installed" "Red"
        exit 1
    }
    
    # Check if npm is installed
    try {
        $npmVersion = npm --version
        Write-ColorText "✅ npm version: $npmVersion" "Green"
    }
    catch {
        Write-ColorText "❌ npm is not installed" "Red"
        exit 1
    }
}

function Install-Dependencies {
    Write-Host ""
    Write-Host "Installing dependencies..."
    
    $services = @("backend", "ai-engine")
    
    foreach ($service in $services) {
        if (Test-Path $service) {
            Write-Host "Installing dependencies for $service..."
            Push-Location $service
            try {
                npm install --silent
                Write-ColorText "✅ ${service} dependencies installed" "Green"
            }
            catch {
                Write-ColorText "❌ Failed to install ${service} dependencies" "Red"
            }
            finally {
                Pop-Location
            }
        }
    }
}

function Run-Linting {
    Write-Host ""
    Write-ColorText "Running linting checks..." "Blue"
    
    $services = @("backend", "ai-engine")
    
    foreach ($service in $services) {
        if (Test-Path $service) {
            Write-Host "Linting $service..."
            Push-Location $service
            try {
                npm run lint
                Write-ColorText "✅ ${service} linting PASSED" "Green"
                $script:PassedTests++
            }
            catch {
                Write-ColorText "❌ ${service} linting FAILED" "Red"
                $script:FailedTests++
            }
            finally {
                Pop-Location
            }
            $script:TotalTests++
        }
    }
}

function Run-TypeChecking {
    Write-Host ""
    Write-ColorText "Running TypeScript type checking..." "Blue"
    
    $services = @("backend", "ai-engine")
    
    foreach ($service in $services) {
        if (Test-Path $service) {
            Write-Host "Type checking $service..."
            Push-Location $service
            try {
                npm run typecheck
                Write-ColorText "✅ ${service} type checking PASSED" "Green"
                $script:PassedTests++
            }
            catch {
                Write-ColorText "❌ ${service} type checking FAILED" "Red"
                $script:FailedTests++
            }
            finally {
                Pop-Location
            }
            $script:TotalTests++
        }
    }
}

function Show-Report {
    Write-Host ""
    Write-ColorText "🔒 Security Test Results Summary" "Blue"
    Write-Host "==============================="
    Write-Host "Total Test Suites: $TotalTests"
    Write-ColorText "Passed: $PassedTests" "Green"
    Write-ColorText "Failed: $FailedTests" "Red"
    
    if ($FailedTests -eq 0) {
        Write-Host ""
        Write-ColorText "🎉 All security tests PASSED! 🎉" "Green"
        Write-ColorText "✅ HaloBuzz is ready for secure deployment" "Green"
        exit 0
    }
    else {
        Write-Host ""
        Write-ColorText "❌ Some security tests FAILED" "Red"
        Write-ColorText "⚠️  Please fix failing tests before deployment" "Yellow"
        exit 1
    }
}

function Show-Help {
    Write-Host "HaloBuzz Security Test Runner (PowerShell)"
    Write-Host ""
    Write-Host "Usage: .\scripts\test-security.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Quick      Run security tests without coverage"
    Write-Host "  -LintOnly   Run linting checks only"
    Write-Host "  -Help       Show this help message"
    Write-Host ""
    Write-Host "Default: Run full security test suite with coverage"
}

function Main {
    Write-ColorText "🔒 HaloBuzz Security Test Suite" "Blue"
    Write-Host "================================"
    
    # Check prerequisites
    Test-Prerequisites
    
    # Install dependencies
    Install-Dependencies
    
    # Run linting
    Run-Linting
    
    # Run type checking
    Run-TypeChecking
    
    # Run security-specific tests
    Write-Host ""
    Write-ColorText "Running Security Test Suites" "Blue"
    Write-Host "============================"
    
    # Backend security tests
    Run-TestSuite "backend" "npm run test:security" "Payment Fraud, Risk Controls, Compliance, Feature Flags, Middleware"
    
    # AI Engine security tests
    Run-TestSuite "ai-engine" "npm run test:security" "JWT Auth, HMAC Validation, Input Sanitization, Rate Limiting"
    
    # Run full test suites with coverage
    Write-Host ""
    Write-ColorText "Running Full Test Suites with Coverage" "Blue"
    Write-Host "====================================="
    
    Run-TestSuite "backend" "npm run test:coverage" "Full Backend Test Suite with Coverage"
    Run-TestSuite "ai-engine" "npm run test:coverage" "Full AI Engine Test Suite with Coverage"
    
    # Generate final report
    Show-Report
}

# Handle script arguments
if ($Help) {
    Show-Help
}
elseif ($Quick) {
    Write-Host "Running quick security tests (no coverage)..."
    Test-Prerequisites
    Run-TestSuite "backend" "npm run test:security" "Backend Security Tests"
    Run-TestSuite "ai-engine" "npm run test:security" "AI Engine Security Tests"
    Show-Report
}
elseif ($LintOnly) {
    Write-Host "Running linting checks only..."
    Test-Prerequisites
    Run-Linting
    Show-Report
}
else {
    Main
}
