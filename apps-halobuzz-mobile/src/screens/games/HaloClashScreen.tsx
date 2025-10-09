import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 4;
const CELL_SIZE = (SCREEN_WIDTH - 80) / GRID_SIZE;

// Game phases
type GamePhase = 'draft' | 'positioning' | 'battle' | 'result';

// Hero draft option
interface HeroOption {
  id: string;
  name: string;
  role: 'assault' | 'support' | 'tank' | 'sniper' | 'specialist';
  avatar?: string;
}

// Grid position
interface GridPosition {
  row: number;
  col: number;
}

// Team member
interface TeamMember {
  heroId: string;
  heroData: HeroOption;
  position: GridPosition | null;
}

// Battle state
interface BattleState {
  currentTime: number;
  blueTeam: Array<{
    id: string;
    heroId: string;
    currentHealth: number;
    maxHealth: number;
    currentShield: number;
    maxShield: number;
    isAlive: boolean;
    position: GridPosition;
  }>;
  redTeam: Array<{
    id: string;
    heroId: string;
    currentHealth: number;
    maxHealth: number;
    currentShield: number;
    maxShield: number;
    isAlive: boolean;
    position: GridPosition;
  }>;
  lastAction?: {
    heroId: string;
    action: string;
    targetId?: string;
    damage?: number;
  };
}

// Role colors
const roleColors: Record<string, string[]> = {
  assault: ['#E74C3C', '#C0392B'],
  support: ['#2ECC71', '#27AE60'],
  tank: ['#3498DB', '#2980B9'],
  sniper: ['#9B59B6', '#8E44AD'],
  specialist: ['#F39C12', '#E67E22'],
};

const roleIcons: Record<string, string> = {
  assault: 'rocket',
  support: 'medical',
  tank: 'shield',
  sniper: 'rifle',
  specialist: 'flask',
};

export default function HaloClashScreen({ navigation }: any) {
  const [phase, setPhase] = useState<GamePhase>('draft');
  const [myTeam, setMyTeam] = useState<TeamMember[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<TeamMember[]>([]);
  const [draftPool, setDraftPool] = useState<HeroOption[]>([]);
  const [selectedHero, setSelectedHero] = useState<TeamMember | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [winner, setWinner] = useState<'blue' | 'red' | null>(null);

  // Animation values
  const [battleAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    initializeDraft();
  }, []);

  const initializeDraft = () => {
    // Mock hero pool
    const mockHeroes: HeroOption[] = [
      { id: 'spartan-117', name: 'Spartan-117', role: 'assault' },
      { id: 'arbiter', name: 'Arbiter', role: 'assault' },
      { id: 'cortana', name: 'Cortana', role: 'support' },
      { id: 'hunter', name: 'Hunter', role: 'tank' },
      { id: 'nova-sniper', name: 'Nova', role: 'sniper' },
      { id: 'prophet', name: 'Prophet', role: 'specialist' },
      { id: 'marine', name: 'Marine', role: 'assault' },
      { id: 'elite', name: 'Elite', role: 'assault' },
      { id: 'johnson', name: 'Johnson', role: 'support' },
      { id: 'grunt', name: 'Grunt', role: 'tank' },
    ];

    setDraftPool(mockHeroes);
  };

  const handleDraftHero = (hero: HeroOption) => {
    if (myTeam.length >= 5) {
      Alert.alert('Team Full', 'Maximum 5 heroes per team');
      return;
    }

    setMyTeam([
      ...myTeam,
      {
        heroId: hero.id,
        heroData: hero,
        position: null,
      },
    ]);

    // Remove from pool
    setDraftPool(draftPool.filter(h => h.id !== hero.id));

    // AI drafts for opponent
    setTimeout(() => {
      if (enemyTeam.length < 5 && draftPool.length > 1) {
        const aiPick = draftPool[Math.floor(Math.random() * (draftPool.length - 1))];
        setEnemyTeam([
          ...enemyTeam,
          {
            heroId: aiPick.id,
            heroData: aiPick,
            position: null,
          },
        ]);
        setDraftPool(draftPool.filter(h => h.id !== aiPick.id && h.id !== hero.id));
      }
    }, 500);
  };

  const handleFinishDraft = () => {
    if (myTeam.length < 3) {
      Alert.alert('Need More Heroes', 'Select at least 3 heroes');
      return;
    }

    // Auto-position enemy team
    const positionedEnemyTeam = enemyTeam.map((member, index) => ({
      ...member,
      position: {
        row: Math.floor(index / 2),
        col: index % 2 === 0 ? 0 : 3,
      },
    }));
    setEnemyTeam(positionedEnemyTeam);

    setPhase('positioning');
  };

  const handleSelectHeroForPositioning = (member: TeamMember) => {
    setSelectedHero(member);
  };

  const handlePlaceHero = (row: number, col: number) => {
    if (!selectedHero) return;

    // Check if position is occupied
    const occupied = myTeam.some(
      m => m.position && m.position.row === row && m.position.col === col
    );

    if (occupied) {
      Alert.alert('Position Occupied', 'Choose another position');
      return;
    }

    // Place hero
    setMyTeam(
      myTeam.map(m =>
        m.heroId === selectedHero.heroId
          ? { ...m, position: { row, col } }
          : m
      )
    );
    setSelectedHero(null);
  };

  const handleStartBattle = () => {
    // Validate all heroes are positioned
    const allPositioned = myTeam.every(m => m.position !== null);
    if (!allPositioned) {
      Alert.alert('Position All Heroes', 'All heroes must be placed on the grid');
      return;
    }

    setPhase('battle');
    simulateBattle();
  };

  const simulateBattle = async () => {
    // Initialize battle state
    const initialState: BattleState = {
      currentTime: 0,
      blueTeam: myTeam.map((m, i) => ({
        id: `blue-${i}`,
        heroId: m.heroId,
        currentHealth: 1000,
        maxHealth: 1000,
        currentShield: 200,
        maxShield: 200,
        isAlive: true,
        position: m.position!,
      })),
      redTeam: enemyTeam.map((m, i) => ({
        id: `red-${i}`,
        heroId: m.heroId,
        currentHealth: 1000,
        maxHealth: 1000,
        currentShield: 200,
        maxShield: 200,
        isAlive: true,
        position: m.position!,
      })),
    };

    setBattleState(initialState);

    // Animate battle
    Animated.loop(
      Animated.sequence([
        Animated.timing(battleAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(battleAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simulate combat for 10 seconds
    let time = 0;
    const interval = setInterval(() => {
      time += 1000;

      // Random damage
      setBattleState(prev => {
        if (!prev) return prev;

        const newState = { ...prev };
        newState.currentTime = time;

        // Random attack
        const attackerTeam = Math.random() > 0.5 ? 'blue' : 'red';
        const defenderTeam = attackerTeam === 'blue' ? 'red' : 'blue';

        const attackers = newState[`${attackerTeam}Team` as 'blueTeam' | 'redTeam'].filter(h => h.isAlive);
        const defenders = newState[`${defenderTeam}Team` as 'blueTeam' | 'redTeam'].filter(h => h.isAlive);

        if (attackers.length > 0 && defenders.length > 0) {
          const attacker = attackers[Math.floor(Math.random() * attackers.length)];
          const defender = defenders[Math.floor(Math.random() * defenders.length)];

          const damage = 50 + Math.floor(Math.random() * 100);

          // Apply damage
          if (defender.currentShield > 0) {
            const shieldDamage = Math.min(defender.currentShield, damage);
            defender.currentShield -= shieldDamage;
          } else {
            defender.currentHealth -= damage;
          }

          if (defender.currentHealth <= 0) {
            defender.isAlive = false;
          }

          newState.lastAction = {
            heroId: attacker.heroId,
            action: 'attack',
            targetId: defender.heroId,
            damage,
          };
        }

        return newState;
      });

      // Check victory
      if (time >= 10000) {
        clearInterval(interval);
        finishBattle();
      }
    }, 1000);
  };

  const finishBattle = () => {
    if (!battleState) return;

    const blueAlive = battleState.blueTeam.filter(h => h.isAlive).length;
    const redAlive = battleState.redTeam.filter(h => h.isAlive).length;

    if (blueAlive > redAlive) {
      setWinner('blue');
    } else if (redAlive > blueAlive) {
      setWinner('red');
    }

    setPhase('result');
  };

  const handlePlayAgain = () => {
    setMyTeam([]);
    setEnemyTeam([]);
    setSelectedHero(null);
    setBattleState(null);
    setWinner(null);
    setPhase('draft');
    initializeDraft();
  };

  const renderDraftPhase = () => (
    <View style={styles.phaseContainer}>
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseTitle}>Draft Phase</Text>
        <Text style={styles.phaseSubtitle}>Select 3-5 heroes for your team</Text>
      </View>

      {/* My team */}
      <View style={styles.teamSection}>
        <Text style={styles.teamTitle}>Your Team ({myTeam.length}/5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.teamList}>
            {myTeam.map((member, index) => (
              <View key={index} style={styles.draftedHero}>
                <LinearGradient
                  colors={roleColors[member.heroData.role]}
                  style={styles.draftedHeroGradient}
                >
                  <Ionicons name={roleIcons[member.heroData.role] as any} size={32} color="#FFFFFF" />
                  <Text style={styles.draftedHeroName}>{member.heroData.name}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Hero pool */}
      <ScrollView style={styles.heroPool}>
        <View style={styles.heroGrid}>
          {draftPool.map(hero => (
            <TouchableOpacity
              key={hero.id}
              style={styles.heroCard}
              onPress={() => handleDraftHero(hero)}
            >
              <LinearGradient
                colors={roleColors[hero.role]}
                style={styles.heroCardGradient}
              >
                <Ionicons name={roleIcons[hero.role] as any} size={40} color="#FFFFFF" />
                <Text style={styles.heroCardName}>{hero.name}</Text>
                <Text style={styles.heroCardRole}>{hero.role.toUpperCase()}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Continue button */}
      <TouchableOpacity
        style={[styles.continueButton, myTeam.length < 3 && styles.continueButtonDisabled]}
        onPress={handleFinishDraft}
        disabled={myTeam.length < 3}
      >
        <Text style={styles.continueButtonText}>Continue to Positioning</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderPositioningPhase = () => (
    <View style={styles.phaseContainer}>
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseTitle}>Positioning Phase</Text>
        <Text style={styles.phaseSubtitle}>Place your heroes on the battlefield</Text>
      </View>

      {/* Battlefield grid */}
      <View style={styles.battlefield}>
        {/* Row labels */}
        <View style={styles.rowLabels}>
          <Text style={styles.rowLabel}>FRONT</Text>
          <Text style={styles.rowLabel}>MID</Text>
          <Text style={styles.rowLabel}>MID</Text>
          <Text style={styles.rowLabel}>BACK</Text>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {Array.from({ length: GRID_SIZE }).map((_, row) => (
            <View key={row} style={styles.gridRow}>
              {Array.from({ length: GRID_SIZE }).map((_, col) => {
                const myHero = myTeam.find(
                  m => m.position && m.position.row === row && m.position.col === col
                );
                const enemyHero = enemyTeam.find(
                  m => m.position && m.position.row === row && m.position.col === col
                );

                return (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.gridCell,
                      selectedHero && styles.gridCellActive,
                    ]}
                    onPress={() => handlePlaceHero(row, col)}
                  >
                    {myHero && (
                      <LinearGradient
                        colors={roleColors[myHero.heroData.role]}
                        style={styles.placedHero}
                      >
                        <Ionicons
                          name={roleIcons[myHero.heroData.role] as any}
                          size={24}
                          color="#FFFFFF"
                        />
                      </LinearGradient>
                    )}
                    {enemyHero && (
                      <View style={[styles.placedHero, styles.enemyHero]}>
                        <Ionicons
                          name={roleIcons[enemyHero.heroData.role] as any}
                          size={24}
                          color="#E74C3C"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Hero list */}
      <View style={styles.heroListSection}>
        <Text style={styles.heroListTitle}>
          {selectedHero ? 'Tap a position to place' : 'Select a hero to place'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.heroList}>
            {myTeam.map((member, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.heroListItem,
                  member.position && styles.heroListItemPlaced,
                  selectedHero?.heroId === member.heroId && styles.heroListItemSelected,
                ]}
                onPress={() => handleSelectHeroForPositioning(member)}
              >
                <LinearGradient
                  colors={roleColors[member.heroData.role]}
                  style={styles.heroListItemGradient}
                >
                  <Ionicons
                    name={roleIcons[member.heroData.role] as any}
                    size={28}
                    color="#FFFFFF"
                  />
                  {member.position && (
                    <View style={styles.placedBadge}>
                      <Ionicons name="checkmark" size={12} color="#2ECC71" />
                    </View>
                  )}
                </LinearGradient>
                <Text style={styles.heroListItemName}>{member.heroData.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Start battle button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          !myTeam.every(m => m.position) && styles.continueButtonDisabled,
        ]}
        onPress={handleStartBattle}
        disabled={!myTeam.every(m => m.position)}
      >
        <Text style={styles.continueButtonText}>Start Battle!</Text>
        <Ionicons name="flash" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderBattlePhase = () => (
    <View style={styles.phaseContainer}>
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseTitle}>Battle in Progress</Text>
        <Text style={styles.phaseSubtitle}>
          {battleState ? `${(battleState.currentTime / 1000).toFixed(0)}s` : '0s'}
        </Text>
      </View>

      {/* Battle grid */}
      <View style={styles.battleGrid}>
        {battleState &&
          [...battleState.blueTeam, ...battleState.redTeam].map(hero => {
            const isBlue = hero.id.startsWith('blue');
            const colors = isBlue ? ['#3498DB', '#2980B9'] : ['#E74C3C', '#C0392B'];

            return (
              <Animated.View
                key={hero.id}
                style={[
                  styles.battleHero,
                  {
                    left: hero.position.col * CELL_SIZE + 20,
                    top: hero.position.row * CELL_SIZE + 100,
                    opacity: hero.isAlive ? battleAnimation : 0.3,
                  },
                ]}
              >
                <LinearGradient colors={colors} style={styles.battleHeroGradient}>
                  <View style={styles.battleHeroHealth}>
                    <View
                      style={[
                        styles.battleHeroHealthBar,
                        {
                          width: `${(hero.currentHealth / hero.maxHealth) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Ionicons name="person" size={32} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            );
          })}
      </View>

      {/* Combat log */}
      {battleState?.lastAction && (
        <View style={styles.combatLog}>
          <Text style={styles.combatLogText}>
            {battleState.lastAction.heroId} attacked for {battleState.lastAction.damage} damage!
          </Text>
        </View>
      )}
    </View>
  );

  const renderResultPhase = () => (
    <View style={styles.phaseContainer}>
      <View style={styles.resultHeader}>
        {winner === 'blue' ? (
          <>
            <Ionicons name="trophy" size={64} color="#F39C12" />
            <Text style={styles.resultTitle}>Victory!</Text>
            <Text style={styles.resultSubtitle}>You won the battle</Text>
          </>
        ) : (
          <>
            <Ionicons name="sad" size={64} color="#95A5A6" />
            <Text style={styles.resultTitle}>Defeat</Text>
            <Text style={styles.resultSubtitle}>Better luck next time</Text>
          </>
        )}
      </View>

      {/* Battle stats */}
      {battleState && (
        <View style={styles.resultStats}>
          <View style={styles.resultStatRow}>
            <Text style={styles.resultStatLabel}>Duration:</Text>
            <Text style={styles.resultStatValue}>{(battleState.currentTime / 1000).toFixed(0)}s</Text>
          </View>
          <View style={styles.resultStatRow}>
            <Text style={styles.resultStatLabel}>Your Heroes Alive:</Text>
            <Text style={styles.resultStatValue}>
              {battleState.blueTeam.filter(h => h.isAlive).length}/{battleState.blueTeam.length}
            </Text>
          </View>
          <View style={styles.resultStatRow}>
            <Text style={styles.resultStatLabel}>Enemy Heroes Alive:</Text>
            <Text style={styles.resultStatValue}>
              {battleState.redTeam.filter(h => h.isAlive).length}/{battleState.redTeam.length}
            </Text>
          </View>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.resultButtons}>
        <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
          <Text style={styles.playAgainButtonText}>Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
          <Text style={styles.menuButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {phase === 'draft' && renderDraftPhase()}
      {phase === 'positioning' && renderPositioningPhase()}
      {phase === 'battle' && renderBattlePhase()}
      {phase === 'result' && renderResultPhase()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  phaseContainer: {
    flex: 1,
  },
  phaseHeader: {
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  phaseTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phaseSubtitle: {
    color: '#95A5A6',
    fontSize: 14,
  },
  teamSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  teamTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  teamList: {
    flexDirection: 'row',
    gap: 12,
  },
  draftedHero: {
    width: 80,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  draftedHeroGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  draftedHeroName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  heroPool: {
    flex: 1,
  },
  heroGrid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroCard: {
    width: (SCREEN_WIDTH - 64) / 3,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  heroCardName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
    textAlign: 'center',
  },
  heroCardRole: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 2,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2ECC71',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonDisabled: {
    backgroundColor: '#95A5A6',
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  battlefield: {
    padding: 20,
    flexDirection: 'row',
  },
  rowLabels: {
    width: 60,
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  rowLabel: {
    color: '#95A5A6',
    fontSize: 10,
    fontWeight: 'bold',
    transform: [{ rotate: '-90deg' }],
    height: CELL_SIZE,
    textAlign: 'center',
  },
  grid: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#2C2C3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCellActive: {
    borderColor: '#3498DB',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  placedHero: {
    width: CELL_SIZE - 16,
    height: CELL_SIZE - 16,
    borderRadius: (CELL_SIZE - 16) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enemyHero: {
    backgroundColor: 'rgba(231, 76, 60, 0.3)',
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  heroListSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C3E',
  },
  heroListTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  heroList: {
    flexDirection: 'row',
    gap: 12,
  },
  heroListItem: {
    alignItems: 'center',
  },
  heroListItemPlaced: {
    opacity: 0.5,
  },
  heroListItemSelected: {
    opacity: 1,
  },
  heroListItemGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 2,
  },
  heroListItemName: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  battleGrid: {
    flex: 1,
    position: 'relative',
  },
  battleHero: {
    position: 'absolute',
    width: CELL_SIZE - 16,
    height: CELL_SIZE - 16,
  },
  battleHeroGradient: {
    flex: 1,
    borderRadius: (CELL_SIZE - 16) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  battleHeroHealth: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
  },
  battleHeroHealthBar: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 2,
  },
  combatLog: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
  },
  combatLogText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  resultHeader: {
    alignItems: 'center',
    padding: 40,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  resultSubtitle: {
    color: '#95A5A6',
    fontSize: 16,
    marginTop: 8,
  },
  resultStats: {
    margin: 20,
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
  },
  resultStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  resultStatLabel: {
    color: '#95A5A6',
    fontSize: 16,
  },
  resultStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultButtons: {
    padding: 20,
    gap: 12,
  },
  playAgainButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#3498DB',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
