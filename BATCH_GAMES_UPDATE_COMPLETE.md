# Batch Games Update - Completion Status

## ✅ COMPLETED: CoinFlipDeluxe (Reference Implementation)

**File:** `apps/halobuzz-mobile/src/games/CoinFlipDeluxe/CoinFlipDeluxe.tsx`

### Changes Applied:
1. ✅ **Imports Updated:**
   - Added `audioManager` from AudioManager
   - Added `hapticFeedback` from HapticFeedback
   - Added `economyClient` from EconomyClient
   - Added particle components (ConfettiParticles, LandingParticles, TrailParticles)
   - Added `prefetchGameAssets` from assetsMap
   - Removed `Alert` import

2. ✅ **State Management:**
   - Added `modalState` for custom modals (replaces Alert.alert)
   - Added `particleState` for particle effects
   - Added `fps` tracking with RAF loop
   - Added `showModal` helper function

3. ✅ **Lifecycle Hooks:**
   - Asset prefetching on mount
   - Audio preloading on mount
   - Audio cleanup on unmount
   - FPS monitoring loop

4. ✅ **Alert.alert Replacements:**
   - "Select a side" → `showModal('info', ...)`
   - "Insufficient Balance" → `showModal('error', ...)`
   - "Minimum Stake" → `showModal('error', ...)`
   - Error handling → `showModal('error', ...)`

5. ✅ **Audio Integration:**
   - Flip sound on game start
   - Landing sound after 1 second
   - Win/lose sounds on result
   - Preload all sounds on mount

6. ✅ **Haptic Integration:**
   - `hapticFeedback.coinFlip()` on flip start
   - `hapticFeedback.coinLanding()` on landing
   - `hapticFeedback.gameVictory()` on win
   - `hapticFeedback.gameDefeat()` on loss
   - `hapticFeedback.trigger('selection')` on side selection

7. ✅ **Particle Effects:**
   - Trail particles during flip
   - Landing particles on coin land
   - Confetti on win

8. ✅ **Economy Integration:**
   - `economyClient.stakeCoins()` before game start
   - `economyClient.rewardCoins()` on win
   - Real balance updates from API

9. ✅ **UI Components Added:**
   - Custom modal with icon, title, message, OK button
   - Particle effect overlays
   - FPS counter (dev mode only)

10. ✅ **Performance:**
    - FPS tracking via RAF
    - Color-coded FPS display (green ≥55, yellow ≥30, red <30)

---

## 🚧 REMAINING GAMES - Application Required

### TapDuel
**File:** `apps/halobuzz-mobile/src/games/TapDuel/TapDuel.tsx`
**Status:** Needs Integration Pattern
**Alert.alert Count:** Check needed
**Required Updates:**
- Import audio/haptic/economy/particles
- Add modal state
- Replace Alert.alert with showModal
- Add countdown tick audio
- Add GO air horn sound
- Add tap correct/wrong sounds
- Add haptics (countdown=light, GO=heavy, result=success/error)
- Wire economy client
- Add FPS tracking

### BuzzRunner
**File:** `apps/halobuzz-mobile/src/games/BuzzRunner/BuzzRunner.tsx`
**Status:** Needs Integration Pattern
**Alert.alert Count:** 1
**Required Updates:**
- Import infrastructure
- Add modal state + particles
- Replace Alert.alert
- Add jump/coinPickup/powerup/crash sounds
- Add jump(light)/coin(selection)/crash(heavy) haptics
- Add power-up particle effects (magnet glow, shield bubble, multiplier sparks)
- Wire economy client
- Add FPS tracking

### TriviaRoyale
**File:** `apps/halobuzz-mobile/src/games/TriviaRoyale/TriviaRoyale.tsx`
**Status:** Needs Integration Pattern
**Alert.alert Count:** 4
**Required Updates:**
- Import infrastructure
- Add modal state
- Replace 4 Alert.alert calls
- Add tick/correct/wrong/timeUp sounds
- Add countdown(light)/correct(success)/wrong(error) haptics
- Add confetti on correct answer
- Wire economy client
- Add FPS tracking
- Ensure socket integration for 100-player

### StackStorm
**File:** `apps/halobuzz-mobile/src/games/StackStorm/StackStorm.tsx`
**Status:** Needs Integration Pattern
**Alert.alert Count:** 1
**Required Updates:**
- Import infrastructure
- Add modal state + particles
- Replace Alert.alert
- Add drop/land/perfect/collapse sounds
- Add drop(light)/perfect(success)/collapse(heavy) haptics
- Add perfect-stack sparkle particles
- Add wind particle effect
- Wire economy client
- Add FPS tracking

### BuzzArena
**File:** `apps/halobuzz-mobile/src/games/BuzzArena/BuzzArena.tsx`
**Status:** Needs Integration Pattern
**Alert.alert Count:** 3
**Required Updates:**
- Import infrastructure
- Add modal state
- Replace 3 Alert.alert calls
- Add shoot/hit/victory/defeat sounds
- Add shoot(light)/hit(medium)/victory(success)/defeat(error) haptics
- Add projectile trail particles
- Add health bar animations
- Wire economy client + MMR
- Add FPS tracking

---

## 📋 SYSTEMATIC UPDATE CHECKLIST

For each game, apply this exact pattern:

### Step 1: Update Imports
```typescript
// Remove Alert import, add:
import { audioManager } from '../Services/AudioManager';
import { hapticFeedback } from '../Components/HapticFeedback';
import { economyClient } from '../Services/EconomyClient';
import { ConfettiParticles, LandingParticles, TrailParticles, ExplosionParticles, SparkleParticles } from '../Components/ParticleSystem';
import { prefetchGameAssets } from '../Services/assetsMap';
```

### Step 2: Add State
```typescript
const [modalState, setModalState] = useState<{
  visible: boolean;
  type: 'error' | 'info' | 'success';
  title: string;
  message: string;
}>({ visible: false, type: 'info', title: '', message: '' });

const [particleState, setParticleState] = useState<{
  show: boolean;
  type: 'confetti' | 'explosion' | 'sparkle' | 'trail' | 'landing';
  x: number;
  y: number;
} | null>(null);

const [fps, setFps] = useState(60);
const frameCount = useRef(0);
const lastTime = useRef(Date.now());

const showModal = (type: 'error' | 'info' | 'success', title: string, message: string) => {
  setModalState({ visible: true, type, title, message });
};
```

### Step 3: Add Lifecycle Hooks
```typescript
useEffect(() => {
  prefetchGameAssets('game-id');
  audioManager.preloadGameSounds('game-id');
  return () => audioManager.unloadGameSounds('game-id');
}, []);

useEffect(() => {
  const measureFPS = () => {
    frameCount.current++;
    const now = Date.now();
    const elapsed = now - lastTime.current;
    if (elapsed >= 1000) {
      const currentFPS = Math.round((frameCount.current * 1000) / elapsed);
      setFps(currentFPS);
      frameCount.current = 0;
      lastTime.current = now;
    }
    requestAnimationFrame(measureFPS);
  };
  const rafId = requestAnimationFrame(measureFPS);
  return () => cancelAnimationFrame(rafId);
}, []);
```

### Step 4: Replace Alert.alert
Find all `Alert.alert(...)` and replace with `showModal(...)`

### Step 5: Add Audio Calls
```typescript
audioManager.playSound('game-id', 'soundKey');
```

### Step 6: Add Haptic Calls
```typescript
hapticFeedback.gameVictory(); // or appropriate pattern
```

### Step 7: Add Particles
```typescript
setParticleState({ show: true, type: 'confetti', x: width/2, y: height/2 });
```

### Step 8: Wire Economy
```typescript
// Before game
const stakeResponse = await economyClient.stakeCoins(amount, 'game-id');
setBalance(stakeResponse.newBalance);

// After win
const rewardResponse = await economyClient.rewardCoins(amount, 'game-id', sessionId, metadata);
setBalance(rewardResponse.newBalance);
```

### Step 9: Add UI Components
```typescript
{/* Modal */}
<Modal visible={modalState.visible} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Ionicons 
        name={modalState.type === 'error' ? 'alert-circle' : modalState.type === 'success' ? 'checkmark-circle' : 'information-circle'} 
        size={48} 
        color={modalState.type === 'error' ? '#FF6B6B' : modalState.type === 'success' ? '#4ECDC4' : '#667EEA'} 
      />
      <Text style={styles.modalTitle}>{modalState.title}</Text>
      <Text style={styles.modalMessage}>{modalState.message}</Text>
      <TouchableOpacity onPress={() => setModalState(prev => ({ ...prev, visible: false }))} style={styles.confirmButton}>
        <Text style={styles.confirmButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

{/* Particles */}
{particleState?.show && particleState.type === 'confetti' && (
  <ConfettiParticles x={particleState.x} y={particleState.y} onComplete={() => setParticleState(null)} />
)}

{/* FPS Counter */}
{__DEV__ && (
  <View style={{ position: 'absolute', top: 100, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 8 }}>
    <Text style={{ color: fps >= 55 ? '#10B981' : fps >= 30 ? '#F59E0B' : '#EF4444', fontSize: 14, fontWeight: '600' }}>
      FPS: {fps}
    </Text>
  </View>
)}
```

---

## 🎯 NEXT ACTIONS

1. ✅ **CoinFlipDeluxe** - COMPLETE
2. ⏳ **TapDuel** - Apply pattern (30-45 min)
3. ⏳ **BuzzRunner** - Apply pattern (30-45 min)
4. ⏳ **TriviaRoyale** - Apply pattern (30-45 min)
5. ⏳ **StackStorm** - Apply pattern (30-45 min)
6. ⏳ **BuzzArena** - Apply pattern (30-45 min)

**Total Estimated Time:** 2.5-4 hours for all 5 remaining games

---

## 📊 PROGRESS SUMMARY

| Game | Alert.alert Removed | Audio Added | Haptics Added | Particles Added | Economy Wired | FPS Tracking | Status |
|------|-------------------|-------------|---------------|----------------|---------------|--------------|--------|
| CoinFlipDeluxe | ✅ (4/4) | ✅ | ✅ | ✅ | ✅ | ✅ | **COMPLETE** |
| TapDuel | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| BuzzRunner | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| TriviaRoyale | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| StackStorm | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| BuzzArena | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |

**Overall Progress:** 1/6 games complete (16.7%)

---

**Status:** CoinFlipDeluxe serves as perfect reference. Pattern is proven and documented. Ready for systematic replication.

