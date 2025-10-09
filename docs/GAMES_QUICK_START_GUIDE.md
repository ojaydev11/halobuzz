# HaloBuzz World-Class Games - Quick Start Guide

**For**: Development Team
**Purpose**: Immediate action items to begin implementation
**Timeline**: Start TODAY, ship beta in 90 days

---

## WEEK 1: FOUNDATION SPRINT

### Day 1: Database Setup

```bash
# Install MongoDB schemas
cd backend/src/models

# Create new model files
touch EnhancedPlayer.ts
touch MatchHistory.ts
touch Tournament.ts
touch BattlePass.ts
touch Achievement.ts

# Copy schemas from WORLD_CLASS_GAMES_IMPLEMENTATION.md
# Run migrations
npm run migrate
```

**Files to create**:
- `D:\halobuzz by cursor\backend\src\models\EnhancedPlayer.ts` (copy from implementation doc)
- `D:\halobuzz by cursor\backend\src\models\MatchHistory.ts`
- `D:\halobuzz by cursor\backend\src\models\Tournament.ts`
- `D:\halobuzz by cursor\backend\src\models\BattlePass.ts`
- `D:\halobuzz by cursor\backend\src\models\Achievement.ts`

**Success Criteria**: All schemas deployed, indexes created

---

### Day 2: API Routes

```bash
# Create new route files
cd backend/src/routes

touch enhanced-player.ts
touch matchmaking-v2.ts
touch tournament.ts
touch battle-pass.ts
touch shop.ts

# Add routes to main server
# Edit: backend/src/server.ts
```

**Implementation**:
1. Copy route handlers from WORLD_CLASS_GAMES_IMPLEMENTATION.md
2. Add authentication middleware
3. Add validation middleware
4. Register routes in server.ts

**Success Criteria**: All endpoints return 200 OK for authenticated requests

---

### Day 3: Service Layer

```bash
# Create service files
cd backend/src/services

touch ProgressionService.ts
touch RankedService.ts
touch TournamentService.ts
touch BattlePassService.ts
touch ShopService.ts
```

**Business Logic to Implement**:
- Account XP calculation and level-ups
- Ranked LP gain/loss formulas
- Tournament bracket generation
- Battle pass tier calculations
- Shop item pricing and discounts

**Success Criteria**: Unit tests pass for all services

---

### Day 4: Real-Time Integration

```bash
# Enhance Socket.IO handlers
cd backend/src/realtime

# Edit existing files
# Add new event handlers for:
# - match_found
# - rank_update
# - battle_pass_tier_unlock
# - achievement_unlocked
```

**Socket Events to Add**:
```typescript
// Player joins queue
socket.on('matchmaking:join', async (data) => { /* ... */ });

// Match found notification
socket.emit('match:found', { matchId, players, acceptBy });

// Rank update after match
socket.emit('rank:update', { newRank, lpChange, mmrChange });
```

**Success Criteria**: Real-time events trigger correctly in mobile app

---

### Day 5: Mobile UI Scaffolding

```bash
# Create new screens
cd apps/halobuzz-mobile/src/screens

mkdir games-v2
cd games-v2

touch HaloArenaLobbyScreen.tsx
touch HaloArenaRankedScreen.tsx
touch HaloRoyaleLobbyScreen.tsx
touch HaloClashLobbyScreen.tsx
touch BattlePassScreen.tsx
touch ShopScreen.tsx
touch ProfileScreen.tsx
```

**React Native Screens**:
- Lobby with "Play Ranked" and "Play Casual" buttons
- Ranked screen showing current tier, LP, and leaderboard
- Battle pass screen with tier progression bar
- Shop screen with featured items
- Profile screen with stats and achievements

**Success Criteria**: All screens navigable with placeholder content

---

## WEEK 2: PROGRESSION SYSTEMS

### Tasks for Backend Team

**Ranked System Implementation**:
```typescript
// File: backend/src/services/RankedService.ts

export class RankedService {
  // Calculate LP gain/loss based on MMR difference
  calculateLPChange(
    playerMMR: number,
    opponentAvgMMR: number,
    won: boolean,
    streak: number
  ): number {
    const expectedWinRate = 1 / (1 + Math.pow(10, (opponentAvgMMR - playerMMR) / 400));
    const actualResult = won ? 1 : 0;
    const baseLPChange = 20;

    let lpChange = baseLPChange * (actualResult - expectedWinRate);

    // Add streak bonus
    if (won && streak >= 3) {
      lpChange += Math.min(streak - 2, 5); // Max +5 for streak
    }

    return Math.round(lpChange);
  }

  // Check for tier promotion
  async checkPromotion(userId: string, gameMode: string): Promise<boolean> {
    const player = await EnhancedPlayer.findOne({ userId });
    const ranking = player.rankings[gameMode];

    if (ranking.lp >= 100) {
      // Promote to next division
      ranking.lp -= 100;

      if (ranking.division === 1) {
        // Promote to next tier
        ranking.rank = this.getNextRank(ranking.rank);
        ranking.division = 3;
      } else {
        ranking.division -= 1;
      }

      await player.save();
      return true;
    }

    return false;
  }
}
```

**Battle Pass Service**:
```typescript
// File: backend/src/services/BattlePassService.ts

export class BattlePassService {
  async addBattlePassXP(userId: string, xp: number): Promise<{
    tierUnlocked: boolean;
    newTier?: number;
    rewards?: any[];
  }> {
    const player = await EnhancedPlayer.findOne({ userId });

    player.battlePass.experience += xp;

    const expPerTier = 1000;
    const newTier = Math.floor(player.battlePass.experience / expPerTier);

    if (newTier > player.battlePass.tier && newTier <= 100) {
      const unlockedRewards = [];

      // Award rewards for each tier unlocked
      for (let tier = player.battlePass.tier + 1; tier <= newTier; tier++) {
        const rewards = this.getTierRewards(tier, player.battlePass.isPremium);
        unlockedRewards.push(...rewards);

        // Add rewards to inventory
        for (const reward of rewards) {
          if (reward.type === 'skin') {
            player.inventory.skins.push(reward.id);
          } else if (reward.type === 'emote') {
            player.inventory.emotes.push(reward.id);
          } else if (reward.type === 'coins') {
            player.coins += reward.amount;
          }
        }
      }

      player.battlePass.tier = newTier;
      await player.save();

      return {
        tierUnlocked: true,
        newTier,
        rewards: unlockedRewards
      };
    }

    await player.save();

    return { tierUnlocked: false };
  }
}
```

**Deliverable**: Ranked and battle pass systems functional

---

### Tasks for Mobile Team

**Ranked Screen UI**:
```typescript
// File: apps/halobuzz-mobile/src/screens/games-v2/RankedScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

export const RankedScreen = ({ route }) => {
  const { gameMode } = route.params;
  const { user } = useAuth();
  const [ranking, setRanking] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    loadRanking();
    loadLeaderboard();
  }, []);

  const loadRanking = async () => {
    const response = await api.get(`/player/rankings/${gameMode}`);
    setRanking(response.data.data);
  };

  const loadLeaderboard = async () => {
    const response = await api.get(`/player/leaderboard/${gameMode}?limit=100`);
    setLeaderboard(response.data.data.leaderboard);
  };

  if (!ranking) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      {/* Rank Badge */}
      <View style={styles.rankBadge}>
        <Text style={styles.rankName}>{ranking.rank}</Text>
        <Text style={styles.division}>Division {ranking.division}</Text>
      </View>

      {/* LP Bar */}
      <View style={styles.lpBar}>
        <View style={[styles.lpFill, { width: `${ranking.lp}%` }]} />
        <Text style={styles.lpText}>{ranking.lp} / 100 LP</Text>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <StatCard label="MMR" value={ranking.mmr} />
        <StatCard label="Wins" value={ranking.wins} />
        <StatCard label="Win Rate" value={`${ranking.winRate.toFixed(1)}%`} />
        <StatCard label="Global Rank" value={`#${ranking.globalRank}`} />
      </View>

      {/* Leaderboard */}
      <Text style={styles.sectionTitle}>Top 100 Players</Text>
      <FlatList
        data={leaderboard}
        renderItem={({ item }) => <LeaderboardRow player={item} />}
        keyExtractor={(item) => item.userId}
      />

      {/* Play Button */}
      <Button
        title="Find Ranked Match"
        onPress={() => navigation.navigate('QueueScreen', { gameMode, ranked: true })}
        style={styles.playButton}
      />
    </View>
  );
};
```

**Battle Pass Screen**:
```typescript
// File: apps/halobuzz-mobile/src/screens/games-v2/BattlePassScreen.tsx

export const BattlePassScreen = () => {
  const [battlePass, setBattlePass] = useState(null);

  useEffect(() => {
    loadBattlePass();
  }, []);

  const loadBattlePass = async () => {
    const response = await api.get('/player/battle-pass');
    setBattlePass(response.data.data);
  };

  const purchasePremium = async () => {
    await api.post('/player/battle-pass/purchase', { tier: 'premium' });
    loadBattlePass();
  };

  if (!battlePass) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Season {battlePass.currentSeason} Battle Pass</Text>
        <Text style={styles.tier}>Tier {battlePass.tier} / 100</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${battlePass.progress * 100}%` }]} />
        <Text style={styles.progressText}>
          {battlePass.expToNext} XP to next tier
        </Text>
      </View>

      {/* Premium Upsell (if not premium) */}
      {!battlePass.isPremium && (
        <View style={styles.upsell}>
          <Text style={styles.upsellTitle}>Unlock Premium Battle Pass</Text>
          <Text style={styles.upsellDesc}>
            Get 70 exclusive rewards including legendary skins
          </Text>
          <Button title="Buy for 950 coins" onPress={purchasePremium} />
        </View>
      )}

      {/* Tier Rewards */}
      <Text style={styles.sectionTitle}>Rewards</Text>
      <FlatList
        horizontal
        data={Array.from({ length: 100 }, (_, i) => i + 1)}
        renderItem={({ item: tier }) => (
          <TierRewardCard
            tier={tier}
            unlocked={tier <= battlePass.tier}
            claimed={battlePass.claimedRewards.includes(tier)}
            isPremium={battlePass.isPremium}
          />
        )}
        keyExtractor={(item) => item.toString()}
      />
    </ScrollView>
  );
};
```

**Deliverable**: Functional ranked and battle pass UIs

---

## WEEK 3: CONTENT CREATION

### 3D Art Team Tasks

**HaloArena Heroes (Priority: First 10)**:
1. **Assault Heroes**:
   - Spartan-117 (Balanced assault, iconic)
   - Elite Warrior (High damage, glass cannon)

2. **Tank Heroes**:
   - Brute Chieftain (High HP, crowd control)
   - UNSC Marine Heavy (Shield abilities)

3. **Support Heroes**:
   - Combat Medic (Healing + buffs)
   - Covenant Engineer (Shields + repair)

4. **Sniper Heroes**:
   - ODST Marksman (Long range burst)
   - Jackal Sniper (Mobility + precision)

5. **Specialist Heroes**:
   - Forerunner Sentinel (Summons drones)
   - Flood Parasite (Converts enemies)

**Asset Requirements per Hero**:
- Base 3D model (5K-8K polygons)
- 3 LOD levels
- Rigged skeleton (30 bones)
- 4 animation sets (idle, walk, attack, abilities)
- 3 skin variations (base + 2 unlockables)
- VFX for abilities (particles, trails)

**Deliverable**: 10 heroes fully modeled, rigged, animated

---

### Game Design Team Tasks

**Hero Ability Design Document**:
```markdown
# Spartan-117 (Assault)

## Role
Balanced assault hero, jack-of-all-trades

## Statistics
- Health: 800
- Shield: 300
- Movement Speed: 330 units/s
- Attack Range: 400 units
- Attack Damage: 60 per shot
- Attack Speed: 2.0 shots/s

## Abilities

### Q - Grenade Toss
- Cooldown: 8s
- Range: 600 units
- Radius: 200 units
- Damage: 150
- Description: Throws a frag grenade that explodes on impact

### W - Active Camo
- Cooldown: 20s
- Duration: 5s
- Description: Become invisible for 5 seconds. Attacking breaks invisibility.

### E - Sprint
- Cooldown: 15s
- Duration: 3s
- Speed Bonus: +50%
- Description: Sprint forward at increased speed

### R - Spartan Laser (Ultimate)
- Cooldown: 90s
- Charge Time: 2s
- Range: 1200 units
- Damage: 800
- Description: Channel a devastating laser beam that pierces enemies
```

**Repeat for all 20 heroes**

**Deliverable**: Complete ability design for 20 heroes

---

## WEEK 4: MATCHMAKING V2

### Backend Implementation

**Role Queue System**:
```typescript
// File: backend/src/services/MatchmakingService.ts

interface QueueEntry {
  userId: string;
  mmr: number;
  preferredRoles: string[];
  queuedAt: Date;
}

export class MatchmakingService {
  private queues = new Map<string, QueueEntry[]>();

  async joinQueue(params: {
    userId: string;
    gameMode: string;
    preferredRoles: string[];
  }): Promise<any> {
    const queue = this.queues.get(params.gameMode) || [];

    const entry: QueueEntry = {
      userId: params.userId,
      mmr: await this.getPlayerMMR(params.userId, params.gameMode),
      preferredRoles: params.preferredRoles,
      queuedAt: new Date()
    };

    queue.push(entry);
    this.queues.set(params.gameMode, queue);

    // Trigger matchmaking
    await this.attemptMatch(params.gameMode);

    return {
      queuePosition: queue.length,
      estimatedWaitTime: this.estimateWaitTime(params.gameMode, entry.mmr)
    };
  }

  private async attemptMatch(gameMode: string): Promise<void> {
    const queue = this.queues.get(gameMode) || [];

    if (gameMode === 'halo-arena' && queue.length >= 10) {
      // Try to create 5v5 match with role balance
      const match = this.createBalancedMatch(queue, 10, ['assault', 'tank', 'support', 'sniper', 'specialist']);

      if (match) {
        // Remove matched players from queue
        this.queues.set(gameMode, queue.filter(e => !match.includes(e.userId)));

        // Notify players
        for (const userId of match) {
          io.to(userId).emit('match:found', {
            matchId: this.generateMatchId(),
            players: match,
            acceptBy: Date.now() + 30000 // 30 seconds to accept
          });
        }
      }
    }
  }

  private createBalancedMatch(
    queue: QueueEntry[],
    requiredPlayers: number,
    roles: string[]
  ): string[] | null {
    // Simplified: Real implementation would use optimal team composition algorithm
    // Priority: 1) MMR balance, 2) Role preferences, 3) Wait time

    const sortedByWaitTime = queue.sort((a, b) =>
      a.queuedAt.getTime() - b.queuedAt.getTime()
    );

    if (sortedByWaitTime.length < requiredPlayers) return null;

    // Take top 10 by wait time
    const candidates = sortedByWaitTime.slice(0, requiredPlayers);

    // Check MMR variance
    const mmrs = candidates.map(c => c.mmr);
    const avgMMR = mmrs.reduce((sum, mmr) => sum + mmr, 0) / mmrs.length;
    const variance = mmrs.reduce((sum, mmr) => sum + Math.pow(mmr - avgMMR, 2), 0) / mmrs.length;

    if (variance > 300 * 300) { // Variance too high
      return null;
    }

    return candidates.map(c => c.userId);
  }
}
```

**Deliverable**: Role queue and balanced matchmaking working

---

## WEEKS 5-8: TOURNAMENT SYSTEM

### Backend Tournament Infrastructure

**Bracket Generation**:
```typescript
// File: backend/src/services/TournamentService.ts

export class TournamentService {
  async createTournament(params: {
    name: string;
    gameMode: string;
    format: 'single-elimination' | 'double-elimination';
    maxParticipants: number;
    entryFee: number;
    startTime: Date;
  }): Promise<ITournament> {
    const tournament = await Tournament.create({
      tournamentId: this.generateTournamentId(),
      ...params,
      status: 'scheduled',
      currentParticipants: 0,
      registeredPlayers: [],
      prizePool: {
        total: 0,
        distribution: this.calculatePrizeDistribution(params.format),
        platformFee: 0
      },
      bracket: { rounds: [] }
    });

    return tournament;
  }

  async registerPlayer(tournamentId: string, userId: string): Promise<void> {
    const tournament = await Tournament.findOne({ tournamentId });

    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'registration') throw new Error('Registration closed');
    if (tournament.registeredPlayers.includes(userId)) throw new Error('Already registered');
    if (tournament.currentParticipants >= tournament.maxParticipants) {
      throw new Error('Tournament full');
    }

    // Charge entry fee
    const player = await EnhancedPlayer.findOne({ userId });
    if (player.coins < tournament.entryFee) {
      throw new Error('Insufficient coins');
    }

    player.coins -= tournament.entryFee;
    await player.save();

    // Add to tournament
    tournament.registeredPlayers.push(userId);
    tournament.currentParticipants += 1;
    tournament.prizePool.total += tournament.entryFee * 0.70; // 30% platform fee
    tournament.prizePool.platformFee += tournament.entryFee * 0.30;

    await tournament.save();
  }

  async startTournament(tournamentId: string): Promise<void> {
    const tournament = await Tournament.findOne({ tournamentId });

    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'registration') throw new Error('Tournament not in registration');

    // Generate bracket
    const bracket = this.generateBracket(
      tournament.registeredPlayers,
      tournament.format
    );

    tournament.bracket = bracket;
    tournament.status = 'in-progress';
    await tournament.save();

    // Start first round matches
    await this.startRound(tournamentId, 1);
  }

  private generateBracket(
    players: string[],
    format: 'single-elimination' | 'double-elimination'
  ): any {
    const rounds = [];
    let currentPlayers = [...players];

    // Seed players randomly (in production, seed by MMR)
    currentPlayers = this.shuffle(currentPlayers);

    let roundNumber = 1;

    while (currentPlayers.length > 1) {
      const matches = [];

      for (let i = 0; i < currentPlayers.length; i += 2) {
        if (i + 1 < currentPlayers.length) {
          matches.push({
            matchId: this.generateMatchId(),
            participant1: currentPlayers[i],
            participant2: currentPlayers[i + 1]
          });
        } else {
          // Bye (advance automatically)
          matches.push({
            matchId: this.generateMatchId(),
            participant1: currentPlayers[i],
            participant2: 'BYE',
            winner: currentPlayers[i]
          });
        }
      }

      rounds.push({ roundNumber, matches });
      roundNumber++;

      // Next round has half the players
      currentPlayers = matches
        .filter(m => m.winner)
        .map(m => m.winner);
    }

    return { rounds };
  }

  async reportMatchResult(
    tournamentId: string,
    matchId: string,
    winner: string
  ): Promise<void> {
    const tournament = await Tournament.findOne({ tournamentId });

    if (!tournament) throw new Error('Tournament not found');

    // Find match in bracket
    for (const round of tournament.bracket.rounds) {
      const match = round.matches.find((m: any) => m.matchId === matchId);

      if (match) {
        match.winner = winner;
        match.loser = match.participant1 === winner ? match.participant2 : match.participant1;
        match.completedAt = new Date();

        await tournament.save();

        // Check if round is complete
        const roundComplete = round.matches.every((m: any) => m.winner);

        if (roundComplete) {
          // Start next round
          await this.startRound(tournamentId, round.roundNumber + 1);
        }

        return;
      }
    }

    throw new Error('Match not found');
  }

  async distributePrizes(tournamentId: string): Promise<void> {
    const tournament = await Tournament.findOne({ tournamentId });

    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'completed') throw new Error('Tournament not completed');

    const standings = tournament.finalStandings!;

    for (const standing of standings) {
      const player = await EnhancedPlayer.findOne({ userId: standing.participant });

      if (player) {
        player.coins += standing.prizeWon;
        await player.save();

        // Notify player
        io.to(standing.participant).emit('tournament:prize', {
          tournamentId,
          placement: standing.placement,
          prize: standing.prizeWon
        });
      }
    }
  }
}
```

**Deliverable**: Full tournament system with brackets and prizes

---

## WEEKS 9-12: POLISH & LAUNCH PREP

### Final Tasks

**Performance Optimization**:
- Profile mobile app with React Native Profiler
- Optimize render cycles (use React.memo, useMemo)
- Reduce bundle size (code splitting)
- Optimize image assets (WebP format, compression)
- Test on low-end devices (2GB RAM target)

**Testing**:
- Write Playwright E2E tests for critical flows
- Load test with 1000 concurrent matchmaking
- Stress test tournament with 128 participants
- Test IAP flows (sandbox mode)
- Security audit (penetration testing)

**Documentation**:
- API reference documentation
- Game design documentation
- Player guides (how to play each game)
- Admin operations guide

**Launch Checklist**:
- [ ] All APIs return <200ms P95
- [ ] Mobile app crashes <0.1%
- [ ] 100+ skins available
- [ ] 20+ heroes balanced
- [ ] Ranked system functional
- [ ] Battle pass Season 1 ready
- [ ] Tournament system tested
- [ ] Payment integration validated
- [ ] Privacy policy + ToS published
- [ ] App store listings created

---

## TOOLS & RESOURCES

### Development Tools
- **IDE**: VS Code with TypeScript, ESLint, Prettier
- **API Testing**: Postman collection provided
- **Database**: MongoDB Compass for inspection
- **Real-Time Testing**: Socket.IO client tester
- **Mobile Testing**: Expo Go app

### Design Tools
- **3D Modeling**: Blender (free, open-source)
- **Texturing**: Substance Painter
- **Animation**: Mixamo (free rigging/animation)
- **UI Design**: Figma (prototypes provided)

### Collaboration
- **Project Management**: Jira board (link TBD)
- **Documentation**: Confluence wiki
- **Communication**: Slack workspace
- **Version Control**: Git with feature branches

---

## DAILY STANDUP FORMAT

### What to Report
1. **Yesterday**: Tasks completed, blockers resolved
2. **Today**: Tasks planned, estimated completion
3. **Blockers**: Dependencies, questions, issues

### Example Standup (Backend Engineer)
```
Yesterday:
- Implemented ranked LP calculation service
- Added unit tests for promotion logic
- Deployed to staging environment

Today:
- Implement battle pass XP service
- Create API endpoint for tier unlock
- Write integration tests

Blockers:
- Need clarification on battle pass reward structure
- Waiting on 3D assets for skin preview
```

---

## SUCCESS METRICS (WEEKLY TRACKING)

### Week 1-4: Foundation
- [ ] Database schemas deployed
- [ ] API endpoints functional (100% success rate)
- [ ] Mobile screens navigable
- [ ] Real-time events working

### Week 5-8: Features
- [ ] Ranked system live
- [ ] Battle pass functional
- [ ] Tournament backend complete
- [ ] 10 heroes modeled

### Week 9-12: Polish
- [ ] All 20 heroes in-game
- [ ] 100+ skins available
- [ ] Performance targets met
- [ ] Zero P1 bugs

---

## EMERGENCY CONTACTS

### Technical Issues
- **Backend Lead**: [Name] - [Email]
- **Mobile Lead**: [Name] - [Email]
- **DevOps**: [Name] - [Email]

### Product Issues
- **Product Manager**: [Name] - [Email]
- **Game Designer**: [Name] - [Email]

### Business Issues
- **CEO**: [Name] - [Email]
- **Finance**: [Name] - [Email]

---

## LET'S BUILD SOMETHING EXTRAORDINARY

This is our opportunity to create a world-class gaming platform. Every line of code, every 3D model, every design decision contributes to our goal: **compete with billion-dollar apps and win**.

**Principles**:
1. **Quality over speed** (but ship fast too)
2. **Player experience first** (not just features)
3. **Data-driven decisions** (not assumptions)
4. **Collaboration over silos** (we win together)

**Let's go build the future of mobile gaming.**

---

**Document Owner**: Development Team Lead
**Last Updated**: 2025-10-09
**Next Review**: Weekly during standups
