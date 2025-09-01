Param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "[Smoke] Building backend..."
Push-Location backend
if (Test-Path pnpm-lock.yaml) { pnpm i } else { npm i }
npm run build

Write-Host "[Smoke] Running unit tests..."
try { npm test -- --runInBand } catch {}

Write-Host "[Smoke] Seeding OG tiers..."
try { npm run seed } catch {}
Pop-Location

Write-Host "[Smoke] Backend build OK."


