# Detox E2E Tests - HaloBuzz Games

## Overview
End-to-end tests for all 6 HaloBuzz games using Detox framework.

## Test Coverage

### Games Tested
1. **CoinFlipDeluxe** - 3D coin flip mechanics, stake modal, result verification
2. **TapDuel** - Reaction time gameplay, solo mode, personal best
3. **BuzzRunner** - Endless runner physics, jump mechanics, game over
4. **TriviaRoyale** - Category selection, matchmaking, multiplayer flow
5. **StackStorm** - Block stacking physics, perfect stack combos, tower collapse
6. **BuzzArena** - MMR matchmaking, high-stakes entry, competitive flow

### Test Types
- **Smoke Tests**: Core gameplay flow verification
- **Navigation Tests**: Game entry/exit, hub navigation
- **UI Tests**: Element visibility, button interactions
- **Flow Tests**: Complete game session from start to finish

## Running Tests

### Prerequisites
```bash
# Install Detox CLI
npm install -g detox-cli

# Install dependencies (if not already installed)
npm install --save-dev detox jest-circus
```

### iOS Simulator
```bash
# Build iOS app for testing
detox build --configuration ios.sim.debug

# Run all tests
detox test --configuration ios.sim.debug

# Run specific game test
detox test --configuration ios.sim.debug e2e/coinFlipDeluxe.e2e.ts

# Run with cleanup between tests
detox test --configuration ios.sim.debug --cleanup
```

### Android Emulator
```bash
# Build Android app for testing
detox build --configuration android.emu.debug

# Run all tests
detox test --configuration android.emu.debug

# Run specific game test
detox test --configuration android.emu.debug e2e/tapDuel.e2e.ts
```

### Android Device (Attached)
```bash
# Build for attached device
detox build --configuration android.att.debug

# Run tests on device
detox test --configuration android.att.debug
```

## Test Structure

### Setup (`setup.ts`)
- Launches app with required permissions
- Reloads React Native between tests
- Cleans up after test suite

### Config (`config.json`)
- Jest configuration
- 120-second timeout for slow games
- Detox reporter integration

### Individual Tests
Each game has its own test file with:
- Navigation verification
- Core gameplay testing
- UI element validation
- Return-to-hub flow

## CI Integration

### GitHub Actions
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: cd apps/halobuzz-mobile && detox build --configuration ios.sim.debug
      - run: cd apps/halobuzz-mobile && detox test --configuration ios.sim.debug --record-logs all
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: detox-artifacts
          path: apps/halobuzz-mobile/e2e/artifacts

  e2e-android:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: cd apps/halobuzz-mobile && detox build --configuration android.emu.debug
      - run: cd apps/halobuzz-mobile && detox test --configuration android.emu.debug --record-logs all
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: detox-artifacts-android
          path: apps/halobuzz-mobile/e2e/artifacts
```

## Test IDs

### Required Test IDs in Components
For tests to work, components must have `testID` props:

```typescript
// Games Hub
<TouchableOpacity testID="game-card-coin-flip-deluxe">

// Navigation
<TouchableOpacity testID="tab-games">
<TouchableOpacity testID="back-button">

// Game Elements
<TouchableOpacity testID="select-heads">
<TouchableOpacity testID="flip-button">
<View testID="flip-result">
<Text testID="score-display">

// Entry Fees
<TouchableOpacity testID="entry-fee-100">
<TouchableOpacity testID="entry-fee-500">

// Matchmaking
<View testID="matchmaking-status">
<TouchableOpacity testID="cancel-matchmaking">
```

## Troubleshooting

### Common Issues

**1. App not launching**
```bash
# Clean builds
rm -rf ios/build android/app/build
detox build --configuration ios.sim.debug
```

**2. Element not found**
- Verify testID is set on component
- Check element is visible (not covered by modal)
- Increase timeout: `withTimeout(10000)`

**3. Tests timeout**
- Increase jest timeout in `config.json`
- Check for infinite loops or blocked UI
- Verify network requests complete

**4. Simulator/Emulator issues**
```bash
# Reset iOS simulator
xcrun simctl erase all

# Kill Android emulator
adb devices | grep emulator | cut -f1 | xargs -I {} adb -s {} emu kill
```

## Best Practices

1. **Keep tests independent**: Each test should work in isolation
2. **Use meaningful testIDs**: Descriptive IDs make debugging easier
3. **Add waits strategically**: Don't over-wait, but ensure elements load
4. **Clean state between tests**: Use `beforeEach` to reset
5. **Test real user flows**: Mimic actual user behavior
6. **Handle async properly**: Use `waitFor` for dynamic elements

## Coverage Goals

- ✅ All 6 games have smoke tests
- ✅ Navigation flows tested
- ✅ Core gameplay verified
- ⏳ Multiplayer flows (require mock server)
- ⏳ Tournament integration
- ⏳ Economy/coin transactions

## Next Steps

1. Add testIDs to all game components
2. Implement multiplayer test mocks
3. Add tournament flow tests
4. Create performance benchmarks
5. Add screenshot regression tests

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Detox Actions](https://wix.github.io/Detox/docs/api/actions)
- [Detox Matchers](https://wix.github.io/Detox/docs/api/matchers)

