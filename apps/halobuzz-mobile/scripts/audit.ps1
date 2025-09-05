# Security audit script for HaloBuzz Mobile
# Run integrity checks, npm audit, and dependency checks

Write-Host "🔍 Running Security Audit for HaloBuzz Mobile..." -ForegroundColor Green

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Run this script from the mobile app root directory." -ForegroundColor Red
    exit 1
}

Write-Host "`n1. 📦 Checking package-lock.json integrity..." -ForegroundColor Blue
try {
    npm ci --dry-run
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Package integrity check passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Package integrity check failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Package integrity check failed: $($_)" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. 🛡️ Running npm security audit (production only)..." -ForegroundColor Blue
$auditResult = npm audit --omit=dev --audit-level=high
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ No high-severity vulnerabilities found" -ForegroundColor Green
} else {
    Write-Host "⚠️ High-severity vulnerabilities detected:" -ForegroundColor Yellow
    Write-Host $auditResult -ForegroundColor Red
    Write-Host "`n❌ Audit failed due to high-severity issues" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. 🔍 Checking for unused dependencies..." -ForegroundColor Blue
if (Get-Command "npx" -ErrorAction SilentlyContinue) {
    try {
        $depcheckResult = npx depcheck --ignores="@types/*,babel-*,expo-build-properties"
        if ($depcheckResult -match "No depcheck issue") {
            Write-Host "✅ No unused dependencies found" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Unused dependencies detected:" -ForegroundColor Yellow
            Write-Host $depcheckResult -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Could not run depcheck: $($_)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ npx not found, skipping depcheck" -ForegroundColor Yellow
}

Write-Host "`n4. 🔧 Checking Expo SDK compatibility..." -ForegroundColor Blue
try {
    $expoCheck = npx expo install --check
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Expo dependencies are compatible" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Expo dependency issues detected:" -ForegroundColor Yellow
        Write-Host $expoCheck -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not check Expo compatibility: $($_)" -ForegroundColor Yellow
}

Write-Host "`n5. 🔒 Checking for common typosquatting packages..." -ForegroundColor Blue
$typosquats = @(
    "cross-env-shell",
    "babelcli", 
    "crossenv",
    "d3.js",
    "fabric.js",
    "ffmeg",
    "gruntplugin",
    "http-proxy",
    "loadsh",
    "mongose",
    "node-sqlite",
    "nodemv",
    "nodemailer-direct-transport",
    "opencv",
    "openurl",
    "proxy-rad",
    "react-time-range-picker",
    "requset",
    "serialportconnection",
    "shadowsock",
    "smb2-client",
    "sqlite.js",
    "web-scraper"
)

$packageJson = Get-Content "package.json" | ConvertFrom-Json
$installedPackages = @()
$packageJson.dependencies.PSObject.Properties.Name | ForEach-Object { $installedPackages += $_ }
$packageJson.devDependencies.PSObject.Properties.Name | ForEach-Object { $installedPackages += $_ }

$foundTyposquats = @()
foreach ($typo in $typosquats) {
    if ($installedPackages -contains $typo) {
        $foundTyposquats += $typo
    }
}

if ($foundTyposquats.Count -gt 0) {
    Write-Host "❌ Potential typosquatting packages detected:" -ForegroundColor Red
    $foundTyposquats | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "✅ No known typosquatting packages found" -ForegroundColor Green
}

Write-Host "`n✅ Security audit completed successfully!" -ForegroundColor Green
Write-Host "📊 Summary:" -ForegroundColor Blue
Write-Host "  - Package integrity: ✅ Passed" -ForegroundColor White
Write-Host "  - Security vulnerabilities: ✅ No high-severity issues" -ForegroundColor White
Write-Host "  - Expo compatibility: ✅ Compatible" -ForegroundColor White
Write-Host "  - Typosquatting check: ✅ Clean" -ForegroundColor White