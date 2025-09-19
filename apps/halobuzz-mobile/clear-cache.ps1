# PowerShell script to clear Metro cache
Write-Host "🧹 Clearing Metro cache and node_modules..." -ForegroundColor Green

# Clear Metro cache
npx expo start --clear

# Alternative: Clear all caches manually
# Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
# Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
# Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
# npx expo install --fix

Write-Host "✅ Cache cleared! Try running 'npm start' or 'expo start' again." -ForegroundColor Green
