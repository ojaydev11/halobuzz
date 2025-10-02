# 📱 HaloBuzz Mobile Testing Guide

**Your Local IP:** `192.168.0.135`  
**Backend URL:** `http://192.168.0.135:3000`

---

## 🚀 Quick Start

### 1. Install Expo Go on Your Phone

**iOS:**
- Open App Store
- Search "Expo Go"
- Download & Install

**Android:**
- Open Google Play Store
- Search "Expo Go"
- Download & Install

---

### 2. Scan the QR Code

The Expo dev server is now running with **tunnel mode** which means you can test from ANY network (doesn't need to be same WiFi).

**Look for the QR code in your terminal output!** It should say:

```
› Metro waiting on exp://192.168.0.135:8081
› Scan the QR code above with Expo Go (Android) or Camera app (iOS)

█████████████████████████████████
█████████████████████████████████
█████████████████████████████████
█████████████████████████████████
█████████████████████████████████
```

**How to scan:**

**iOS:**
1. Open native Camera app
2. Point at QR code
3. Tap notification that appears
4. App opens in Expo Go

**Android:**
1. Open Expo Go app
2. Tap "Scan QR Code"
3. Point at QR code
4. App loads automatically

---

## 🔧 What's Connected

✅ **Backend Server:** Running on `http://192.168.0.135:3000`  
✅ **Database:** MongoDB (local or cloud - whatever backend is connected to)  
✅ **Real-time:** WebSocket on `ws://192.168.0.135:3000`  
✅ **All Features:** Games, Streaming, Payments, Gifting

---

## 🎮 What You Can Test

### 1. Authentication
- Register new account
- Login with email/password
- Profile setup

### 2. Games
- Browse game list (HaloArena, HaloRoyale, etc.)
- View game details
- Join matchmaking (if server running)

### 3. Live Streaming
- Browse live streams
- View stream details
- Send messages in chat
- Send virtual gifts

### 4. Monetization
- View coin packages
- See gift catalog (60+ gifts)
- Check Battle Pass
- View loot boxes

### 5. Profile & Social
- Edit profile
- View other users
- Follow/unfollow
- Social feed

### 6. OG Membership
- View OG tiers
- See benefits per tier
- Daily bonuses

---

## 🐛 Troubleshooting

### "Network Request Failed"
**Solution:** Make sure:
1. Your phone and computer are on same WiFi network
2. Backend server is running (check terminal)
3. Firewall isn't blocking port 3000

### "Unable to connect to Expo"
**Solution:**
1. Try using tunnel mode (already enabled)
2. Check if Expo Go app is latest version
3. Restart the Expo server

### "API Timeout"
**Solution:**
1. Verify backend is running: open `http://localhost:3000/api/v1/health`
2. Check MongoDB connection
3. Look for errors in backend terminal

---

## 📊 Backend Health Check

Open in browser: `http://localhost:3000/api/v1/health`

Should return:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-10-02T..."
}
```

---

## 🔥 Test Scenarios

### Scenario 1: Complete User Flow (5 min)
1. Register new account
2. Complete profile
3. Browse games
4. View a live stream
5. Send a gift (test coins)
6. Check wallet balance

### Scenario 2: Gaming Flow (10 min)
1. Go to Games tab
2. Select HaloArena MOBA
3. View hero roster
4. Read game rules
5. Enter matchmaking queue
6. (If match found) Play a quick game

### Scenario 3: Streaming Flow (5 min)
1. Go to Live tab
2. Browse active streams
3. Join a popular stream
4. Send messages in chat
5. Send a gift to host
6. View top gifters leaderboard

### Scenario 4: Monetization Flow (5 min)
1. Go to Wallet tab
2. View coin packages
3. See payment methods (Stripe, eSewa, Khalti, IAP)
4. Browse gift catalog
5. Check Battle Pass rewards
6. View OG membership tiers

---

## 🎯 Key Features to Verify

### ✅ Must Work
- [ ] User registration/login
- [ ] Profile viewing/editing
- [ ] Game list loads
- [ ] Live stream list loads
- [ ] Gift catalog displays
- [ ] Navigation between tabs
- [ ] Real-time chat (if stream active)
- [ ] Wallet balance displays

### 🔥 Nice to Have Working
- [ ] Actual gameplay (requires game server)
- [ ] Live streaming (requires host)
- [ ] Payment processing (sandbox mode)
- [ ] Push notifications
- [ ] Real-time updates

---

## 📱 Dev Menu

Shake your device or press `Cmd + D` (iOS) / `Cmd + M` (Android) to open dev menu:

**Useful options:**
- Reload: Refresh the app
- Toggle Element Inspector: Debug UI
- Show Perf Monitor: Check performance
- Remote JS Debugging: Debug in Chrome

---

## 🔄 Hot Reload

The app has **Fast Refresh** enabled. Any code changes you make will automatically reload on your phone!

**Try it:**
1. Open `apps/halobuzz-mobile/app/index.tsx`
2. Change some text
3. Save file
4. Watch it update on your phone instantly! ⚡

---

## 📊 Performance Testing

### Check FPS
- Enable Perf Monitor in dev menu
- Should stay at 60 FPS during navigation
- Acceptable: 30-60 FPS during heavy screens

### Check Memory
- Monitor memory usage in dev menu
- Should stay under 200MB for most screens
- Alert if > 500MB

### Check Network
- Open Chrome DevTools
- Go to Network tab
- Filter by XHR
- Check API response times (should be < 1s)

---

## 🎨 Visual Testing

### Check These Screens
1. **Home/Feed** - Should show game cards, streams
2. **Games List** - Grid of game cards with icons
3. **Game Detail** - Hero info, stats, play button
4. **Live Stream** - Video player, chat, gifts
5. **Profile** - Avatar, stats, achievements
6. **Wallet** - Balance, coin packages, transactions
7. **Settings** - Account, notifications, privacy

### UI Checklist
- [ ] All images load
- [ ] No layout shifts
- [ ] Smooth animations (60fps)
- [ ] Touch targets ≥ 44x44 points
- [ ] Text is readable
- [ ] Dark mode looks good
- [ ] Safe areas respected (notch, home indicator)

---

## 🔐 Test Accounts

**Create test accounts with these emails:**

```
test.player1@halobuzz.test
test.player2@halobuzz.test
test.host1@halobuzz.test
test.whale1@halobuzz.test
```

**Password:** `Test123456!`

**Pre-load test data:**
```bash
# In backend directory
npm run seed:test-users
```

---

## 💡 Pro Tips

1. **Use 2 devices:** Test gifting between accounts
2. **Test landscape mode:** Some games require it
3. **Test with bad network:** Toggle airplane mode on/off
4. **Test notifications:** Send yourself a test push
5. **Test deep links:** Tap on external links to app

---

## 🚨 Common Issues & Fixes

### Issue: "Expo Go keeps crashing"
**Fix:** Clear app cache:
- iOS: Delete Expo Go, reinstall
- Android: Settings > Apps > Expo Go > Clear Cache

### Issue: "Code changes not reflecting"
**Fix:** 
1. Press `R` in terminal to reload
2. Or shake device > Reload

### Issue: "White screen on launch"
**Fix:**
1. Check console for errors
2. Try clearing Metro bundler cache: `npx expo start -c`

### Issue: "APIs not working"
**Fix:**
1. Check backend logs for errors
2. Verify API URL in app.config.ts
3. Test API in Postman first

---

## 📞 Need Help?

**Check logs:**
- Mobile: Shake device > Debug Remote JS
- Backend: Terminal where `npm run dev` is running

**Debug endpoints:**
- Health: `http://192.168.0.135:3000/api/v1/health`
- Auth: `http://192.168.0.135:3000/api/v1/auth/register`
- Games: `http://192.168.0.135:3000/api/v1/games`

---

## ✅ Testing Checklist

Before considering it "production-ready", verify:

### Core Functionality
- [ ] User can register
- [ ] User can login
- [ ] User can view profile
- [ ] User can browse games
- [ ] User can browse streams
- [ ] User can navigate all tabs

### Performance
- [ ] App launches in < 3 seconds
- [ ] Navigation is smooth (60fps)
- [ ] No memory leaks after 10 min usage
- [ ] Images load progressively
- [ ] Offline mode graceful

### Security
- [ ] Passwords are hidden
- [ ] Tokens stored securely
- [ ] HTTPS for production APIs
- [ ] No sensitive data in logs

### UX
- [ ] Loading states show
- [ ] Error messages clear
- [ ] Success feedback visible
- [ ] Empty states handled
- [ ] Pull-to-refresh works

---

## 🎉 You're Ready!

**Your setup:**
- ✅ Backend running locally with real database
- ✅ Mobile app connected to local backend
- ✅ Hot reload enabled
- ✅ Dev tools accessible

**Scan the QR code and start testing! 📱**

---

**Pro tip:** Keep the terminal visible so you can see:
- Backend API logs
- Expo bundler output
- Any errors that occur

**Happy testing! 🚀**

