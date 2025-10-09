# ⚠️ CRITICAL: Server Running from WRONG Directory!

## 🔴 The Problem

Your debug logs show:
```
Resolved entry point: node_modules/expo/AppEntry.js 
(project root: D:\halobuzz by cursor)
                        ^^^^^^^^^^^^^^^^^^^^
                        THIS IS WRONG!
```

**Should be**:
```
(project root: D:\halobuzz by cursor\apps\halobuzz-mobile)
```

## Why This Breaks Everything

When Expo runs from the ROOT directory:
- ❌ It uses the ROOT's node_modules
- ❌ It looks for App.tsx at the root (doesn't exist)
- ❌ It ignores the mobile app's package.json
- ❌ expo-router doesn't work

When Expo runs from MOBILE directory:
- ✅ It uses the mobile app's node_modules
- ✅ It finds the correct expo-router entry
- ✅ It reads the mobile app's package.json
- ✅ Everything works!

## ✅ THE SOLUTION

### Option 1: Use the Batch File (EASIEST)

1. Navigate to: `apps\halobuzz-mobile`
2. **Double-click**: `START_HERE_FIXED.bat`
3. Watch for the log showing correct directory

### Option 2: Manual Start (SAFEST)

**CRITICAL**: You must **physically navigate** to the mobile directory first!

#### In PowerShell:
```powershell
# Step 1: Navigate to mobile app (CRITICAL!)
cd "D:\halobuzz by cursor\apps\halobuzz-mobile"

# Step 2: Verify you're in the right place
Get-Location
# Should show: D:\halobuzz by cursor\apps\halobuzz-mobile

# Step 3: Kill any existing servers
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Step 4: Start Expo
npx expo start --clear --tunnel
```

#### In Command Prompt:
```cmd
cd /d "D:\halobuzz by cursor\apps\halobuzz-mobile"
echo %CD%
npx expo start --clear --tunnel
```

### Option 3: Use Cursor Terminal

1. In Cursor, click **Terminal** menu
2. Click **New Terminal**
3. **IMPORTANT**: The terminal might open at root
4. Type: `cd apps\halobuzz-mobile`
5. Verify with: `dir` (should see package.json, app folder, etc.)
6. Then: `npx expo start --clear --tunnel`

## 🔍 How to Verify It's Correct

After starting, check the first few lines of output:

### ❌ WRONG (Running from root):
```
Starting project at D:\halobuzz by cursor
Resolved entry point: node_modules/expo/AppEntry.js (project root: D:\halobuzz by cursor)
```

### ✅ CORRECT (Running from mobile app):
```
Starting project at D:\halobuzz by cursor\apps\halobuzz-mobile
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^
```

## 🎯 Why Does This Keep Happening?

Possible reasons:
1. Terminal opens at project root by default
2. You're running `npx expo start` from root thinking it will find the app
3. Global Expo CLI is looking in wrong directory
4. Working directory not set correctly

## 💡 Pro Tip: Set Default Directory in Cursor

To make Cursor terminal always open in mobile directory:

1. Open Cursor Settings
2. Search for "terminal.integrated.cwd"
3. Set to: `${workspaceFolder}/apps/halobuzz-mobile`

## 🚀 The Absolute Foolproof Method

Create a PowerShell script at the ROOT level:

**`start-mobile.ps1`** (at project root):
```powershell
#!/usr/bin/env pwsh
Set-Location -Path "$PSScriptRoot\apps\halobuzz-mobile"
Write-Host "Directory: $(Get-Location)" -ForegroundColor Green
npx expo start --clear --tunnel
```

Then from ROOT, just run:
```powershell
.\start-mobile.ps1
```

## 📋 Debugging Checklist

Before you start Expo, verify:

- [ ] Run `pwd` or `cd` - shows `...apps\halobuzz-mobile`
- [ ] Run `ls` or `dir` - shows `app` folder and `package.json`
- [ ] `package.json` has `"main": "expo-router/entry"`
- [ ] No other Expo server running (check with `Get-Process node`)

After Expo starts, verify:

- [ ] First log shows: `Starting project at ...apps\halobuzz-mobile`
- [ ] Debug log shows: `project root: ...apps\halobuzz-mobile`
- [ ] QR code appears
- [ ] NO error about "Unable to resolve ../../App"

## 🎯 Summary

**The #1 rule**: 
```
cd apps\halobuzz-mobile
```

**Before running**:
```
npx expo start
```

**If you see "Unable to resolve ../../App"**, you're in the wrong directory! 

---

**Use `START_HERE_FIXED.bat` in the mobile folder - it handles everything!**

