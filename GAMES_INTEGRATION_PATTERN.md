# Games Integration Pattern

## Reference Implementation: CoinFlipDeluxe

### Required Imports
```typescript
// New infrastructure
import { audioManager } from '../Services/AudioManager';
import { hapticFeedback } from '../Components/HapticFeedback';
import { economyClient } from '../Services/EconomyClient';
import { tournamentClient } from '../Services/TournamentClient';
import { ConfettiParticles, LandingParticles, TrailParticles } from '../Components/ParticleSystem';
import { prefetchGameAssets } from '../Services/assetsMap';
```

### 1. Replace Alert.alert with Modal

**Pattern:**
```typescript
const [modalState, setModalState] = useState<{
  visible: boolean;
  type: 'error' | 'info' | 'success';
  title: string;
  message: string;
}>({ visible: false, type: 'info', title: '', message: '' });

const showModal = (type: 'error' | 'info' | 'success', title: string, message: string) => {
  setModalState({ visible: true, type, title, message });
};

// Replace Alert.alert('Title', 'Message') with:
showModal('error', 'Title', 'Message');
```

**Modal Component:**
```typescript
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
      <TouchableOpacity onPress={() => setModalState(prev => ({ ...prev, visible: false }))} style={styles.modalButton}>
        <Text style={styles.modalButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

### 2. Audio Integration

**Initialization:**
```typescript
useEffect(() => {
  // Preload game sounds on mount
  audioManager.preloadGameSounds('coin-flip-deluxe');
  
  return () => {
    // Cleanup on unmount
    audioManager.unloadGameSounds('coin-flip-deluxe');
  };
}, []);
```

**Playback:**
```typescript
// Flip sound
audioManager.playSound('coin-flip-deluxe', 'flip');

// Landing sound
audioManager.playSound('coin-flip-deluxe', 'landing');

// Win/lose
if (won) {
  audioManager.playSound('coin-flip-deluxe', 'win');
} else {
  audioManager.playSound('coin-flip-deluxe', 'lose');
}
```

### 3. Haptic Integration

**Replace expo-haptics calls:**
```typescript
// Old: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
hapticFeedback.coinFlip(); // Flip action

// Old: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
hapticFeedback.coinLanding(); // Landing

// Old: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
if (won) {
  hapticFeedback.gameVictory();
} else {
  hapticFeedback.gameDefeat();
}
```

### 4. Particle Effects Integration

**State Management:**
```typescript
const [particleConfig, setParticleConfig] = useState<{
  show: boolean;
  type: 'trail' | 'landing' | 'confetti';
  x: number;
  y: number;
} | null>(null);
```

**During Flip:**
```typescript
// Trail particles during flip
setParticleConfig({
  show: true,
  type: 'trail',
  x: coinPosition.x,
  y: coinPosition.y
});
```

**On Landing:**
```typescript
setParticleConfig({
  show: true,
  type: 'landing',
  x: coinPosition.x,
  y: coinPosition.y
});
```

**On Win:**
```typescript
setParticleConfig({
  show: true,
  type: 'confetti',
  x: width / 2,
  y: height / 2
});
```

**Render:**
```typescript
{particleConfig?.show && particleConfig.type === 'confetti' && (
  <ConfettiParticles 
    x={particleConfig.x} 
    y={particleConfig.y} 
    onComplete={() => setParticleConfig(null)} 
  />
)}
{particleConfig?.show && particleConfig.type === 'landing' && (
  <LandingParticles 
    x={particleConfig.x} 
    y={particleConfig.y} 
    onComplete={() => setParticleConfig(null)} 
  />
)}
```

### 5. Economy Integration

**Stake Coins:**
```typescript
const handleStartGame = async () => {
  try {
    // Stake coins before game
    const stakeResponse = await economyClient.stakeCoins(stakeAmount, 'coin-flip-deluxe', sessionId);
    setBalance(stakeResponse.newBalance);
    
    // Start game logic...
  } catch (error) {
    showModal('error', 'Stake Failed', error.message);
  }
};
```

**Reward Coins:**
```typescript
const handleFlipComplete = async (won: boolean, stakeAmount: number) => {
  if (won) {
    const rewardAmount = stakeAmount * 2; // 2x multiplier
    const rewardResponse = await economyClient.rewardCoins(
      rewardAmount,
      'coin-flip-deluxe',
      sessionId,
      { won: true, selectedSide, result }
    );
    setBalance(rewardResponse.newBalance);
  }
};
```

**Check Boost:**
```typescript
useEffect(() => {
  const checkBoost = async () => {
    const boostStatus = await economyClient.getBoostStatus();
    if (boostStatus.active) {
      // Show boost indicator
      setActiveBoost(boostStatus);
    }
  };
  checkBoost();
}, []);
```

### 6. Tournament Integration (Optional)

**Check Active Tournament:**
```typescript
useEffect(() => {
  const loadActiveTournaments = async () => {
    const tournaments = await tournamentClient.listActiveTournaments('coin-flip-deluxe');
    setActiveTournaments(tournaments);
  };
  loadActiveTournaments();
}, []);
```

**Submit Score:**
```typescript
const submitTournamentScore = async (tournamentId: string, score: number) => {
  try {
    const response = await tournamentClient.submitScore(
      tournamentId,
      sessionId,
      score,
      { selectedSide, result, won }
    );
    
    if (response.isNewHighScore) {
      showModal('success', 'New High Score!', `Rank: ${response.rank}`);
    }
  } catch (error) {
    console.error('Tournament score submission failed:', error);
  }
};
```

### 7. Performance Tracking

**FPS Monitoring:**
```typescript
const [fps, setFps] = useState(60);
const frameCount = useRef(0);
const lastTime = useRef(Date.now());

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

// Display in dev mode
{__DEV__ && (
  <Text style={styles.fpsCounter}>FPS: {fps}</Text>
)}
```

### 8. Asset Prefetch

**On Component Mount:**
```typescript
useEffect(() => {
  prefetchGameAssets('coin-flip-deluxe');
}, []);
```

## Replication to Other Games

### TapDuel Pattern
1. Import new infrastructure
2. Replace 6 Alert.alert calls with modals
3. Add countdown tick audio + GO air horn
4. Add tap haptics (light for countdown, heavy for GO, success/error for result)
5. Wire to EconomyClient
6. Socket integration for multiplayer (already has SocketManager)

### BuzzRunner Pattern
1. Import new infrastructure
2. Replace Alert.alert with modals
3. Add jump, coinPickup, powerup, crash sounds
4. Add jump (light), coin (selection), crash (heavy) haptics
5. Add power-up particle effects
6. Wire to EconomyClient

### TriviaRoyale Pattern
1. Import new infrastructure  
2. Replace Alert.alert with modals
3. Add tick, correct, wrong, timeUp sounds
4. Add countdown (light), correct (success), wrong (error) haptics
5. Add confetti on correct answer
6. Wire to EconomyClient + socket for 100-player

### StackStorm Pattern
1. Import new infrastructure
2. Replace Alert.alert with modals
3. Add drop, land, perfect, collapse sounds
4. Add drop (light), perfect (success), collapse (heavy) haptics
5. Add perfect-stack sparkle particles
6. Add wind particle effect
7. Wire to EconomyClient

### BuzzArena Pattern
1. Import new infrastructure
2. Replace Alert.alert with modals
3. Add shoot, hit, victory, defeat sounds
4. Add shoot (light), hit (medium), victory (success), defeat (error) haptics
5. Add projectile trail particles
6. Add health bar animations
7. Wire to EconomyClient + MMR matching

## Critical Files to Update

**For Each Game:**
1. Main game component (*.tsx)
2. Remove all `Alert.alert` imports and calls
3. Add modal state + component
4. Add audio, haptic, particle imports
5. Initialize audioManager on mount
6. Replace all user feedback with new systems
7. Wire economy integration
8. Add performance tracking

**Common Pattern:**
```typescript
// Top of file
import { audioManager } from '../Services/AudioManager';
import { hapticFeedback } from '../Components/HapticFeedback';
import { economyClient } from '../Services/EconomyClient';
import { ConfettiParticles, LandingParticles } from '../Components/ParticleSystem';

// Component body
useEffect(() => {
  audioManager.preloadGameSounds('game-id');
  prefetchGameAssets('game-id');
  return () => audioManager.unloadGameSounds('game-id');
}, []);

// Replace Alert.alert everywhere with modal
const showMessage = (type, title, message) => {
  setModalState({ visible: true, type, title, message });
};

// Use hapticFeedback instead of Haptics
hapticFeedback.gameVictory();

// Play sounds
audioManager.playSound('game-id', 'soundKey');

// Show particles
<ConfettiParticles x={x} y={y} onComplete={...} />
```

This pattern ensures all games have:
- ✅ No Alert.alert 
- ✅ Real audio feedback
- ✅ Proper haptics
- ✅ Visual particle effects
- ✅ Economy integration
- ✅ Performance tracking
- ✅ Asset prefetching

