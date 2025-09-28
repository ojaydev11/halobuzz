// HaloArena Game Screen - Real-time MOBA gameplay UI
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  SafeAreaView,
  StatusBar,
  PanGestureHandler,
  State as GestureState,
  PinchGestureHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Rect, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Game UI components and types
interface Player {
  id: string;
  name: string;
  teamId: 'red' | 'blue';
  role: 'assault' | 'support' | 'tank' | 'sniper' | 'specialist';
  hero: string;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  isAlive: boolean;
  isVisible: boolean;
  lastSeen?: number;
}

interface Ability {
  id: string;
  name: string;
  cooldown: number;
  lastUsed: number;
  energyCost: number;
  icon: string;
  keybind: string;
}

interface GameState {
  gameTime: number;
  phase: 'draft' | 'playing' | 'paused' | 'ended';
  players: Player[];
  myPlayerId: string;
  teams: {
    red: { score: number; kills: number };
    blue: { score: number; kills: number };
  };
  objectives: Array<{
    id: string;
    type: 'tower' | 'dragon' | 'baron';
    position: { x: number; y: number };
    health: number;
    maxHealth: number;
    teamId?: 'red' | 'blue';
    respawnTime?: number;
  }>;
}

interface MinimapProps {
  gameState: GameState;
  mapSize: number;
  onMapTap: (position: { x: number; y: number }) => void;
}

// Minimap Component
const Minimap: React.FC<MinimapProps> = ({ gameState, mapSize, onMapTap }) => {
  const mapScale = 120 / mapSize; // Scale factor for minimap

  const handleMapPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const worldX = (locationX - 60) / mapScale;
    const worldY = (locationY - 60) / mapScale;
    onMapTap({ x: worldX, y: worldY });
  };

  return (
    <TouchableOpacity onPress={handleMapPress} style={styles.minimap}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        {/* Map background */}
        <Rect width={120} height={120} fill="rgba(13, 20, 33, 0.8)" />

        {/* Map lanes */}
        <Line x1={10} y1={30} x2={110} y2={30} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        <Line x1={10} y1={60} x2={110} y2={60} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        <Line x1={10} y1={90} x2={110} y2={90} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />

        {/* Objectives */}
        {gameState.objectives.map((obj) => (
          <Circle
            key={obj.id}
            cx={60 + obj.position.x * mapScale}
            cy={60 + obj.position.y * mapScale}
            r={obj.type === 'tower' ? 3 : 5}
            fill={obj.teamId === 'red' ? '#f44336' : obj.teamId === 'blue' ? '#2196F3' : '#FFA726'}
            opacity={obj.health > 0 ? 1 : 0.3}
          />
        ))}

        {/* Players */}
        {gameState.players.map((player) => (
          <Circle
            key={player.id}
            cx={60 + player.position.x * mapScale}
            cy={60 + player.position.y * mapScale}
            r={player.id === gameState.myPlayerId ? 4 : 3}
            fill={player.teamId === 'red' ? '#f44336' : '#2196F3'}
            stroke={player.id === gameState.myPlayerId ? '#FFD700' : 'none'}
            strokeWidth={player.id === gameState.myPlayerId ? 1 : 0}
            opacity={player.isAlive ? 1 : 0.3}
          />
        ))}

        {/* Vision range for my player */}
        {(() => {
          const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId);
          if (myPlayer) {
            return (
              <Circle
                cx={60 + myPlayer.position.x * mapScale}
                cy={60 + myPlayer.position.y * mapScale}
                r={20 * mapScale}
                fill="none"
                stroke="rgba(255, 215, 0, 0.3)"
                strokeWidth={1}
              />
            );
          }
          return null;
        })()}
      </Svg>
    </TouchableOpacity>
  );
};

// Ability Button Component
const AbilityButton: React.FC<{
  ability: Ability;
  onPress: () => void;
  disabled: boolean;
}> = ({ ability, onPress, disabled }) => {
  const cooldownProgress = useMemo(() => {
    const timeSinceUse = Date.now() - ability.lastUsed;
    const progress = Math.max(0, Math.min(1, timeSinceUse / ability.cooldown));
    return progress;
  }, [ability.lastUsed, ability.cooldown]);

  return (
    <TouchableOpacity
      style={[styles.abilityButton, disabled && styles.abilityButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={disabled ? ['#424242', '#212121'] : ['#42A5F5', '#1E88E5']}
        style={styles.abilityButtonGradient}
      >
        <Ionicons name={ability.icon as any} size={20} color="white" />
        <Text style={styles.abilityKeybind}>{ability.keybind}</Text>

        {cooldownProgress < 1 && (
          <View style={styles.cooldownOverlay}>
            <View
              style={[
                styles.cooldownProgress,
                { height: `${(1 - cooldownProgress) * 100}%` }
              ]}
            />
            <Text style={styles.cooldownText}>
              {Math.ceil((ability.cooldown - (Date.now() - ability.lastUsed)) / 1000)}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Health/Shield Bar Component
const HealthBar: React.FC<{
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  style?: any;
}> = ({ health, maxHealth, shield, maxShield, style }) => {
  const healthPercent = (health / maxHealth) * 100;
  const shieldPercent = (shield / maxShield) * 100;

  return (
    <View style={[styles.healthBarContainer, style]}>
      <View style={styles.healthBar}>
        <View style={[styles.healthFill, { width: `${healthPercent}%` }]} />
      </View>
      {maxShield > 0 && (
        <View style={styles.shieldBar}>
          <View style={[styles.shieldFill, { width: `${shieldPercent}%` }]} />
        </View>
      )}
    </View>
  );
};

export default function HaloArenaGameScreen() {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    gameTime: 0,
    phase: 'playing',
    myPlayerId: 'player1',
    teams: {
      red: { score: 12, kills: 34 },
      blue: { score: 8, kills: 28 }
    },
    players: [
      {
        id: 'player1',
        name: 'You',
        teamId: 'blue',
        role: 'assault',
        hero: 'Spartan Assault',
        position: { x: 200, y: 0 },
        health: 680,
        maxHealth: 800,
        shield: 150,
        maxShield: 200,
        energy: 80,
        maxEnergy: 100,
        level: 12,
        kills: 4,
        deaths: 2,
        assists: 6,
        isAlive: true,
        isVisible: true
      },
      // Add more mock players...
    ],
    objectives: [
      {
        id: 'dragon',
        type: 'dragon',
        position: { x: -400, y: -400 },
        health: 3200,
        maxHealth: 5000,
        respawnTime: 300000
      },
      {
        id: 'baron',
        type: 'baron',
        position: { x: 400, y: 400 },
        health: 8000,
        maxHealth: 8000
      }
    ]
  });

  // Player abilities
  const [abilities] = useState<Ability[]>([
    {
      id: 'q',
      name: 'Plasma Rifle',
      cooldown: 1000,
      lastUsed: 0,
      energyCost: 10,
      icon: 'radio-outline',
      keybind: 'Q'
    },
    {
      id: 'w',
      name: 'Frag Grenade',
      cooldown: 8000,
      lastUsed: Date.now() - 3000,
      energyCost: 30,
      icon: 'radio-button-on',
      keybind: 'W'
    },
    {
      id: 'e',
      name: 'Shield Boost',
      cooldown: 15000,
      lastUsed: Date.now() - 10000,
      energyCost: 40,
      icon: 'shield',
      keybind: 'E'
    },
    {
      id: 'r',
      name: 'Spartan Charge',
      cooldown: 60000,
      lastUsed: Date.now() - 45000,
      energyCost: 80,
      icon: 'flash',
      keybind: 'R'
    }
  ]);

  // UI state
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [cameraZoom, setCameraZoom] = useState(1);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Get current player
  const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId);

  // Game timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        gameTime: prev.gameTime + 1000
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format game time
  const formatGameTime = (timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle ability use
  const handleAbilityUse = (abilityId: string) => {
    const ability = abilities.find(a => a.id === abilityId);
    if (!ability || !myPlayer) return;

    const timeSinceUse = Date.now() - ability.lastUsed;
    if (timeSinceUse < ability.cooldown) return;
    if (myPlayer.energy < ability.energyCost) return;

    // Update ability cooldown
    ability.lastUsed = Date.now();

    // Update player energy
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p =>
        p.id === myPlayer.id
          ? { ...p, energy: p.energy - ability.energyCost }
          : p
      )
    }));

    // Screen shake for ultimate
    if (abilityId === 'r') {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Handle minimap tap
  const handleMinimapTap = (position: { x: number; y: number }) => {
    // Move camera to tapped position
    setCameraPosition(position);
  };

  // Camera pan handler
  const handleCameraPan = (event: any) => {
    if (event.nativeEvent.state === GestureState.ACTIVE) {
      const { translationX, translationY } = event.nativeEvent;
      setCameraPosition(prev => ({
        x: prev.x - translationX / cameraZoom,
        y: prev.y - translationY / cameraZoom
      }));
    }
  };

  // Camera pinch handler
  const handleCameraPinch = (event: any) => {
    if (event.nativeEvent.state === GestureState.ACTIVE) {
      const newZoom = Math.max(0.5, Math.min(3, event.nativeEvent.scale));
      setCameraZoom(newZoom);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      <Animated.View
        style={[
          styles.gameView,
          {
            transform: [
              { translateX: shakeAnim },
              { scale: cameraZoom },
              { translateX: -cameraPosition.x },
              { translateY: -cameraPosition.y }
            ]
          }
        ]}
      >
        {/* Game World - This would be the 3D game view */}
        <PinchGestureHandler onGestureEvent={handleCameraPinch}>
          <PanGestureHandler onGestureEvent={handleCameraPan}>
            <View style={styles.gameWorld}>
              <LinearGradient
                colors={['#0D1421', '#1A237E', '#0D1421']}
                style={styles.gameBackground}
              >
                <Text style={styles.gameWorldPlaceholder}>
                  3D Game World
                  {'\n'}Camera: ({cameraPosition.x.toFixed(0)}, {cameraPosition.y.toFixed(0)})
                  {'\n'}Zoom: {cameraZoom.toFixed(1)}x
                </Text>
              </LinearGradient>
            </View>
          </PanGestureHandler>
        </PinchGestureHandler>
      </Animated.View>

      {/* UI Overlay */}
      <View style={styles.uiOverlay} pointerEvents="box-none">
        {/* Top HUD */}
        <View style={styles.topHUD}>
          {/* Game Timer */}
          <BlurView intensity={20} tint="dark" style={styles.gameTimer}>
            <Text style={styles.gameTimeText}>{formatGameTime(gameState.gameTime)}</Text>
          </BlurView>

          {/* Team Scores */}
          <View style={styles.teamScores}>
            <View style={[styles.teamScore, styles.redTeam]}>
              <Text style={styles.teamScoreText}>{gameState.teams.red.score}</Text>
              <Text style={styles.teamKillsText}>{gameState.teams.red.kills}K</Text>
            </View>
            <Text style={styles.scoreVs}>VS</Text>
            <View style={[styles.teamScore, styles.blueTeam]}>
              <Text style={styles.teamScoreText}>{gameState.teams.blue.score}</Text>
              <Text style={styles.teamKillsText}>{gameState.teams.blue.kills}K</Text>
            </View>
          </View>

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Left HUD - Minimap */}
        <View style={styles.leftHUD}>
          <Minimap
            gameState={gameState}
            mapSize={2000}
            onMapTap={handleMinimapTap}
          />
        </View>

        {/* Right HUD - Scoreboard Toggle */}
        <View style={styles.rightHUD}>
          <TouchableOpacity
            style={styles.scoreboardButton}
            onPress={() => setShowScoreboard(!showScoreboard)}
          >
            <Ionicons name="list-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom HUD */}
        <View style={styles.bottomHUD}>
          {/* Player Health/Shield */}
          {myPlayer && (
            <View style={styles.playerStatus}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{myPlayer.hero}</Text>
                <Text style={styles.playerLevel}>Level {myPlayer.level}</Text>
                <Text style={styles.playerKDA}>
                  {myPlayer.kills}/{myPlayer.deaths}/{myPlayer.assists}
                </Text>
              </View>

              <View style={styles.playerBars}>
                <HealthBar
                  health={myPlayer.health}
                  maxHealth={myPlayer.maxHealth}
                  shield={myPlayer.shield}
                  maxShield={myPlayer.maxShield}
                />

                <View style={styles.energyBarContainer}>
                  <View style={styles.energyBar}>
                    <View
                      style={[
                        styles.energyFill,
                        { width: `${(myPlayer.energy / myPlayer.maxEnergy) * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.energyText}>
                    {myPlayer.energy}/{myPlayer.maxEnergy}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Abilities */}
          <View style={styles.abilitiesContainer}>
            {abilities.map((ability) => (
              <AbilityButton
                key={ability.id}
                ability={ability}
                onPress={() => handleAbilityUse(ability.id)}
                disabled={
                  !myPlayer ||
                  Date.now() - ability.lastUsed < ability.cooldown ||
                  myPlayer.energy < ability.energyCost
                }
              />
            ))}
          </View>
        </View>
      </View>

      {/* Scoreboard Modal */}
      {showScoreboard && (
        <View style={styles.scoreboardModal}>
          <BlurView intensity={30} tint="dark" style={styles.scoreboardContent}>
            <View style={styles.scoreboardHeader}>
              <Text style={styles.scoreboardTitle}>Scoreboard</Text>
              <TouchableOpacity onPress={() => setShowScoreboard(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.scoreboardTeams}>
              {/* Red Team */}
              <View style={styles.scoreboardTeam}>
                <Text style={styles.teamTitle}>Red Team</Text>
                {gameState.players
                  .filter(p => p.teamId === 'red')
                  .map(player => (
                    <View key={player.id} style={styles.playerRow}>
                      <Text style={styles.playerRowName}>{player.name}</Text>
                      <Text style={styles.playerRowKDA}>
                        {player.kills}/{player.deaths}/{player.assists}
                      </Text>
                    </View>
                  ))}
              </View>

              {/* Blue Team */}
              <View style={styles.scoreboardTeam}>
                <Text style={styles.teamTitle}>Blue Team</Text>
                {gameState.players
                  .filter(p => p.teamId === 'blue')
                  .map(player => (
                    <View key={player.id} style={styles.playerRow}>
                      <Text style={styles.playerRowName}>{player.name}</Text>
                      <Text style={styles.playerRowKDA}>
                        {player.kills}/{player.deaths}/{player.assists}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          </BlurView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gameView: {
    flex: 1,
  },
  gameWorld: {
    flex: 1,
  },
  gameBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameWorldPlaceholder: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topHUD: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  gameTimer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  gameTimeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  teamScore: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 50,
  },
  redTeam: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  blueTeam: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
  },
  teamScoreText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  teamKillsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  scoreVs: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftHUD: {
    position: 'absolute',
    left: 20,
    top: 120,
  },
  minimap: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rightHUD: {
    position: 'absolute',
    right: 20,
    top: 120,
  },
  scoreboardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomHUD: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  playerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 12,
  },
  playerInfo: {
    marginRight: 16,
  },
  playerName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerLevel: {
    color: '#FFA726',
    fontSize: 12,
    marginTop: 2,
  },
  playerKDA: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  playerBars: {
    flex: 1,
  },
  healthBarContainer: {
    height: 6,
    marginBottom: 4,
  },
  healthBar: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  shieldBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  shieldFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  energyBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  energyBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  energyFill: {
    height: '100%',
    backgroundColor: '#FF9800',
  },
  energyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    minWidth: 40,
  },
  abilitiesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  abilityButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  abilityButtonDisabled: {
    opacity: 0.6,
  },
  abilityButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  abilityKeybind: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cooldownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cooldownProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  cooldownText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scoreboardModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scoreboardContent: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderRadius: 16,
    padding: 20,
  },
  scoreboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreboardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreboardTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreboardTeam: {
    flex: 1,
    marginHorizontal: 10,
  },
  teamTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 4,
  },
  playerRowName: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  playerRowKDA: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
});