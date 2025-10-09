import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Hero interfaces
interface Hero {
  id: string;
  name: string;
  title: string;
  role: 'assault' | 'support' | 'tank' | 'sniper' | 'specialist';
  difficulty: 'easy' | 'medium' | 'hard';
  baseStats: {
    health: number;
    shield: number;
    damage: number;
    range: number;
    speed: number;
  };
  abilities: Ability[];
  passive: Ability;
  counters: {
    strongAgainst: string[];
    weakAgainst: string[];
  };
  mastery?: {
    level: number;
    totalXP: number;
    gamesPlayed: number;
    winRate: number;
  };
}

interface Ability {
  id: string;
  name: string;
  type: 'basic' | 'active' | 'ultimate' | 'passive';
  description: string;
  damage?: number;
  healing?: number;
  cooldown?: number;
  manaCost?: number;
}

// Role colors
const roleColors: Record<string, string[]> = {
  assault: ['#E74C3C', '#C0392B'],
  support: ['#2ECC71', '#27AE60'],
  tank: ['#3498DB', '#2980B9'],
  sniper: ['#9B59B6', '#8E44AD'],
  specialist: ['#F39C12', '#E67E22'],
};

// Role icons
const roleIcons: Record<string, string> = {
  assault: 'rocket',
  support: 'medical',
  tank: 'shield',
  sniper: 'rifle',
  specialist: 'flask',
};

export default function HeroSelectionScreen({ navigation }: any) {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'mastery' | 'winrate'>('name');

  useEffect(() => {
    fetchHeroes();
  }, []);

  const fetchHeroes = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/heroes');
      // const data = await response.json();

      // Mock data - using the heroes from backend/src/data/heroes.ts
      const mockHeroes: Hero[] = [
        {
          id: 'spartan-117',
          name: 'Spartan-117',
          title: 'The Master Chief',
          role: 'assault',
          difficulty: 'medium',
          baseStats: {
            health: 900,
            shield: 250,
            damage: 110,
            range: 450,
            speed: 350,
          },
          abilities: [
            {
              id: 'assault-rifle',
              name: 'Assault Rifle',
              type: 'basic',
              description: 'Rapid-fire automatic weapon',
              damage: 35,
              cooldown: 100,
            },
            {
              id: 'frag-grenade',
              name: 'Frag Grenade',
              type: 'active',
              description: 'Throw explosive grenade',
              damage: 180,
              cooldown: 8000,
            },
            {
              id: 'spartan-charge',
              name: 'Spartan Charge',
              type: 'active',
              description: 'Dash forward and melee strike',
              damage: 120,
              cooldown: 12000,
            },
            {
              id: 'spartan-laser',
              name: 'Spartan Laser',
              type: 'ultimate',
              description: 'Devastating energy beam',
              damage: 500,
              cooldown: 80000,
            },
          ],
          passive: {
            id: 'mjolnir-armor',
            name: 'MJOLNIR Armor',
            type: 'passive',
            description: 'Shield regenerates after 3s out of combat',
          },
          counters: {
            strongAgainst: ['support', 'sniper'],
            weakAgainst: ['tank', 'specialist'],
          },
          mastery: {
            level: 24,
            totalXP: 48000,
            gamesPlayed: 156,
            winRate: 58.3,
          },
        },
        {
          id: 'arbiter',
          name: 'Arbiter',
          title: 'Thel Vadam',
          role: 'assault',
          difficulty: 'hard',
          baseStats: {
            health: 850,
            shield: 300,
            damage: 120,
            range: 200,
            speed: 380,
          },
          abilities: [
            {
              id: 'energy-sword',
              name: 'Energy Sword',
              type: 'basic',
              description: 'Melee attacks with energy sword',
              damage: 75,
              cooldown: 500,
            },
            {
              id: 'active-camo',
              name: 'Active Camo',
              type: 'active',
              description: 'Become invisible for 5 seconds',
              cooldown: 20000,
            },
            {
              id: 'sword-lunge',
              name: 'Sword Lunge',
              type: 'active',
              description: 'Lunge to target and slash',
              damage: 200,
              cooldown: 10000,
            },
            {
              id: 'arbiter-rage',
              name: 'Arbiter Rage',
              type: 'ultimate',
              description: 'Massive AOE energy wave',
              damage: 400,
              cooldown: 90000,
            },
          ],
          passive: {
            id: 'honor-guard',
            name: 'Honor Guard',
            type: 'passive',
            description: 'Taking damage increases attack speed by 10%',
          },
          counters: {
            strongAgainst: ['support', 'sniper'],
            weakAgainst: ['tank'],
          },
          mastery: {
            level: 12,
            totalXP: 18000,
            gamesPlayed: 78,
            winRate: 52.6,
          },
        },
        {
          id: 'cortana',
          name: 'Cortana',
          title: 'AI Companion',
          role: 'support',
          difficulty: 'easy',
          baseStats: {
            health: 600,
            shield: 200,
            damage: 60,
            range: 500,
            speed: 300,
          },
          abilities: [
            {
              id: 'data-burst',
              name: 'Data Burst',
              type: 'basic',
              description: 'Ranged energy projectile',
              damage: 40,
              cooldown: 800,
            },
            {
              id: 'shield-boost',
              name: 'Shield Boost',
              type: 'active',
              description: 'Grant ally 200 shield',
              healing: 200,
              cooldown: 10000,
            },
            {
              id: 'tactical-scan',
              name: 'Tactical Scan',
              type: 'active',
              description: 'Reveal enemies in area',
              cooldown: 15000,
            },
            {
              id: 'rampant-surge',
              name: 'Rampant Surge',
              type: 'ultimate',
              description: 'Team-wide shield and damage buff',
              cooldown: 100000,
            },
          ],
          passive: {
            id: 'digital-presence',
            name: 'Digital Presence',
            type: 'passive',
            description: 'Nearby allies gain +10% ability cooldown reduction',
          },
          counters: {
            strongAgainst: ['assault', 'tank'],
            weakAgainst: ['sniper', 'specialist'],
          },
          mastery: {
            level: 31,
            totalXP: 65000,
            gamesPlayed: 203,
            winRate: 61.1,
          },
        },
        {
          id: 'hunter',
          name: 'Hunter',
          title: 'Lekgolo Colony',
          role: 'tank',
          difficulty: 'medium',
          baseStats: {
            health: 1400,
            shield: 400,
            damage: 90,
            range: 350,
            speed: 280,
          },
          abilities: [
            {
              id: 'assault-cannon',
              name: 'Assault Cannon',
              type: 'basic',
              description: 'Heavy ranged attack',
              damage: 50,
              cooldown: 1000,
            },
            {
              id: 'shield-wall',
              name: 'Shield Wall',
              type: 'active',
              description: 'Block all frontal damage',
              cooldown: 18000,
            },
            {
              id: 'melee-slam',
              name: 'Melee Slam',
              type: 'active',
              description: 'AOE ground pound',
              damage: 150,
              cooldown: 12000,
            },
            {
              id: 'fuel-rod',
              name: 'Fuel Rod',
              type: 'ultimate',
              description: 'Massive explosive projectile',
              damage: 600,
              cooldown: 90000,
            },
          ],
          passive: {
            id: 'armored-colony',
            name: 'Armored Colony',
            type: 'passive',
            description: 'Take 30% reduced damage from behind',
          },
          counters: {
            strongAgainst: ['assault', 'sniper'],
            weakAgainst: ['specialist'],
          },
          mastery: {
            level: 18,
            totalXP: 32000,
            gamesPlayed: 124,
            winRate: 55.6,
          },
        },
        {
          id: 'nova-sniper',
          name: 'Nova',
          title: 'Ghost of Reach',
          role: 'sniper',
          difficulty: 'hard',
          baseStats: {
            health: 650,
            shield: 150,
            damage: 150,
            range: 800,
            speed: 320,
          },
          abilities: [
            {
              id: 'sniper-rifle',
              name: 'Sniper Rifle',
              type: 'basic',
              description: 'Long-range precision shot',
              damage: 120,
              cooldown: 2000,
            },
            {
              id: 'grapple-hook',
              name: 'Grapple Hook',
              type: 'active',
              description: 'Quickly reposition',
              cooldown: 15000,
            },
            {
              id: 'flashbang',
              name: 'Flashbang',
              type: 'active',
              description: 'Blind enemies in area',
              cooldown: 12000,
            },
            {
              id: 'annihilation',
              name: 'Annihilation',
              type: 'ultimate',
              description: 'Three guaranteed critical shots',
              damage: 300,
              cooldown: 85000,
            },
          ],
          passive: {
            id: 'perfect-aim',
            name: 'Perfect Aim',
            type: 'passive',
            description: 'Standing still for 2s grants guaranteed crit',
          },
          counters: {
            strongAgainst: ['support', 'specialist'],
            weakAgainst: ['assault', 'tank'],
          },
          mastery: {
            level: 8,
            totalXP: 12000,
            gamesPlayed: 45,
            winRate: 48.9,
          },
        },
      ];

      setHeroes(mockHeroes);
    } catch (error) {
      console.error('Failed to fetch heroes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredHeroes = () => {
    let filtered = heroes;

    if (selectedRole !== 'all') {
      filtered = filtered.filter((h) => h.role === selectedRole);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'mastery':
          return (b.mastery?.level || 0) - (a.mastery?.level || 0);
        case 'winrate':
          return (b.mastery?.winRate || 0) - (a.mastery?.winRate || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const renderHeroCard = (hero: Hero) => {
    const colors = roleColors[hero.role];

    return (
      <TouchableOpacity
        key={hero.id}
        style={styles.heroCard}
        onPress={() => setSelectedHero(hero)}
      >
        <LinearGradient colors={colors} style={styles.heroCardGradient}>
          {/* Hero avatar placeholder */}
          <View style={styles.heroAvatar}>
            <Ionicons name={roleIcons[hero.role] as any} size={48} color="#FFFFFF" />
          </View>

          {/* Hero info */}
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{hero.name}</Text>
            <Text style={styles.heroTitle}>{hero.title}</Text>

            {/* Role badge */}
            <View style={styles.roleBadge}>
              <Ionicons name={roleIcons[hero.role] as any} size={12} color="#FFFFFF" />
              <Text style={styles.roleBadgeText}>{hero.role.toUpperCase()}</Text>
            </View>

            {/* Difficulty */}
            <View style={styles.difficultyContainer}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.difficultyDot,
                    i <=
                    (hero.difficulty === 'easy' ? 1 : hero.difficulty === 'medium' ? 2 : 3)
                      ? styles.difficultyDotActive
                      : styles.difficultyDotInactive,
                  ]}
                />
              ))}
              <Text style={styles.difficultyText}>{hero.difficulty.toUpperCase()}</Text>
            </View>
          </View>

          {/* Mastery info */}
          {hero.mastery && (
            <View style={styles.masteryInfo}>
              <View style={styles.masteryLevel}>
                <Text style={styles.masteryLevelText}>{hero.mastery.level}</Text>
              </View>
              <Text style={styles.masteryLabel}>Mastery</Text>
              <View style={styles.winRateContainer}>
                <Text style={styles.winRateText}>{hero.mastery.winRate.toFixed(1)}%</Text>
                <Text style={styles.winRateLabel}>Win Rate</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeroDetails = () => {
    if (!selectedHero) return null;

    const colors = roleColors[selectedHero.role];

    return (
      <View style={styles.detailsOverlay}>
        <TouchableOpacity
          style={styles.detailsBackdrop}
          onPress={() => setSelectedHero(null)}
          activeOpacity={1}
        />
        <View style={styles.detailsContent}>
          <LinearGradient colors={colors} style={styles.detailsHeader}>
            <View style={styles.detailsHeroInfo}>
              <View style={styles.detailsHeroAvatar}>
                <Ionicons name={roleIcons[selectedHero.role] as any} size={64} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.detailsHeroName}>{selectedHero.name}</Text>
                <Text style={styles.detailsHeroTitle}>{selectedHero.title}</Text>
                <View style={styles.detailsRoleBadge}>
                  <Ionicons name={roleIcons[selectedHero.role] as any} size={14} color="#FFFFFF" />
                  <Text style={styles.detailsRoleBadgeText}>{selectedHero.role.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedHero(null)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.detailsScrollView}>
            {/* Base Stats */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Base Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Ionicons name="heart" size={20} color="#E74C3C" />
                  <Text style={styles.statLabel}>Health</Text>
                  <Text style={styles.statValue}>{selectedHero.baseStats.health}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="shield" size={20} color="#3498DB" />
                  <Text style={styles.statLabel}>Shield</Text>
                  <Text style={styles.statValue}>{selectedHero.baseStats.shield}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="flash" size={20} color="#E67E22" />
                  <Text style={styles.statLabel}>Damage</Text>
                  <Text style={styles.statValue}>{selectedHero.baseStats.damage}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="locate" size={20} color="#9B59B6" />
                  <Text style={styles.statLabel}>Range</Text>
                  <Text style={styles.statValue}>{selectedHero.baseStats.range}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="speedometer" size={20} color="#2ECC71" />
                  <Text style={styles.statLabel}>Speed</Text>
                  <Text style={styles.statValue}>{selectedHero.baseStats.speed}</Text>
                </View>
              </View>
            </View>

            {/* Abilities */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Abilities</Text>

              {/* Passive */}
              <View style={styles.abilityCard}>
                <View style={[styles.abilityIcon, { backgroundColor: '#95A5A6' }]}>
                  <Ionicons name="infinite" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.abilityInfo}>
                  <Text style={styles.abilityName}>{selectedHero.passive.name}</Text>
                  <Text style={styles.abilityType}>PASSIVE</Text>
                  <Text style={styles.abilityDescription}>{selectedHero.passive.description}</Text>
                </View>
              </View>

              {/* Active abilities */}
              {selectedHero.abilities.map((ability, index) => (
                <View key={ability.id} style={styles.abilityCard}>
                  <View
                    style={[
                      styles.abilityIcon,
                      {
                        backgroundColor:
                          ability.type === 'ultimate'
                            ? '#F39C12'
                            : ability.type === 'active'
                            ? '#3498DB'
                            : '#95A5A6',
                      },
                    ]}
                  >
                    <Text style={styles.abilityIconText}>{index + 1}</Text>
                  </View>
                  <View style={styles.abilityInfo}>
                    <Text style={styles.abilityName}>{ability.name}</Text>
                    <Text style={styles.abilityType}>{ability.type.toUpperCase()}</Text>
                    <Text style={styles.abilityDescription}>{ability.description}</Text>
                    <View style={styles.abilityStats}>
                      {ability.damage && (
                        <Text style={styles.abilityStatText}>
                          <Ionicons name="flash" size={12} color="#E67E22" /> {ability.damage} DMG
                        </Text>
                      )}
                      {ability.healing && (
                        <Text style={styles.abilityStatText}>
                          <Ionicons name="add" size={12} color="#2ECC71" /> {ability.healing} HEAL
                        </Text>
                      )}
                      {ability.cooldown && (
                        <Text style={styles.abilityStatText}>
                          <Ionicons name="time" size={12} color="#95A5A6" /> {ability.cooldown / 1000}s CD
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Counters */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Matchups</Text>
              <View style={styles.countersContainer}>
                <View style={styles.counterColumn}>
                  <Text style={styles.counterTitle}>
                    <Ionicons name="arrow-up" size={14} color="#2ECC71" /> Strong Against
                  </Text>
                  {selectedHero.counters.strongAgainst.map((role) => (
                    <View key={role} style={[styles.counterBadge, { backgroundColor: '#2ECC71' }]}>
                      <Ionicons name={roleIcons[role] as any} size={14} color="#FFFFFF" />
                      <Text style={styles.counterBadgeText}>{role.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.counterColumn}>
                  <Text style={styles.counterTitle}>
                    <Ionicons name="arrow-down" size={14} color="#E74C3C" /> Weak Against
                  </Text>
                  {selectedHero.counters.weakAgainst.map((role) => (
                    <View key={role} style={[styles.counterBadge, { backgroundColor: '#E74C3C' }]}>
                      <Ionicons name={roleIcons[role] as any} size={14} color="#FFFFFF" />
                      <Text style={styles.counterBadgeText}>{role.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Mastery stats */}
            {selectedHero.mastery && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Your Mastery</Text>
                <View style={styles.masteryStatsGrid}>
                  <View style={styles.masteryStatCard}>
                    <Text style={styles.masteryStatValue}>{selectedHero.mastery.level}</Text>
                    <Text style={styles.masteryStatLabel}>Level</Text>
                  </View>
                  <View style={styles.masteryStatCard}>
                    <Text style={styles.masteryStatValue}>{selectedHero.mastery.gamesPlayed}</Text>
                    <Text style={styles.masteryStatLabel}>Games</Text>
                  </View>
                  <View style={styles.masteryStatCard}>
                    <Text style={styles.masteryStatValue}>{selectedHero.mastery.winRate.toFixed(1)}%</Text>
                    <Text style={styles.masteryStatLabel}>Win Rate</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewMasteryButton}
                  onPress={() => {
                    setSelectedHero(null);
                    navigation.navigate('HeroMastery', { heroId: selectedHero.id });
                  }}
                >
                  <Text style={styles.viewMasteryButtonText}>View Full Mastery</Text>
                  <Ionicons name="chevron-forward" size={20} color="#3498DB" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Select button */}
          <TouchableOpacity style={styles.selectButton}>
            <LinearGradient colors={colors} style={styles.selectButtonGradient}>
              <Text style={styles.selectButtonText}>Select Hero</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading heroes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Hero</Text>
        <Text style={styles.headerSubtitle}>{heroes.length} Heroes Available</Text>
      </View>

      {/* Role filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rolesContainer}
        contentContainerStyle={styles.rolesContent}
      >
        <TouchableOpacity
          style={[styles.roleChip, selectedRole === 'all' && styles.roleChipActive]}
          onPress={() => setSelectedRole('all')}
        >
          <Ionicons name="apps" size={20} color={selectedRole === 'all' ? '#FFFFFF' : '#95A5A6'} />
          <Text style={[styles.roleChipText, selectedRole === 'all' && styles.roleChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        {Object.keys(roleColors).map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
            onPress={() => setSelectedRole(role)}
          >
            <Ionicons
              name={roleIcons[role] as any}
              size={20}
              color={selectedRole === role ? '#FFFFFF' : '#95A5A6'}
            />
            <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {['name', 'mastery', 'winrate'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.sortChip, sortBy === option && styles.sortChipActive]}
            onPress={() => setSortBy(option as any)}
          >
            <Text style={[styles.sortChipText, sortBy === option && styles.sortChipTextActive]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Heroes grid */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.heroesGrid}>
          {getFilteredHeroes().map(renderHeroCard)}
        </View>
      </ScrollView>

      {/* Hero details modal */}
      {selectedHero && renderHeroDetails()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#95A5A6',
    fontSize: 14,
  },
  rolesContainer: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  rolesContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C3E',
    marginRight: 8,
  },
  roleChipActive: {
    backgroundColor: '#3498DB',
  },
  roleChipText: {
    color: '#95A5A6',
    fontSize: 14,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  sortLabel: {
    color: '#95A5A6',
    fontSize: 14,
    marginRight: 12,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  sortChipActive: {
    backgroundColor: '#2C2C3E',
  },
  sortChipText: {
    color: '#95A5A6',
    fontSize: 12,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  heroesGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  heroCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  heroCardGradient: {
    padding: 16,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  heroInfo: {
    alignItems: 'center',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  heroTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  difficultyDotActive: {
    backgroundColor: '#FFFFFF',
  },
  difficultyDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  difficultyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginLeft: 4,
  },
  masteryInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  masteryLevel: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  masteryLevelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  masteryLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginBottom: 6,
  },
  winRateContainer: {
    alignItems: 'center',
  },
  winRateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  winRateLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
  },
  detailsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  detailsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  detailsContent: {
    backgroundColor: '#16213E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  detailsHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailsHeroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  detailsHeroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsHeroName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsHeroTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  detailsRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
  },
  detailsRoleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsScrollView: {
    maxHeight: '70%',
  },
  detailsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  detailsSectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: (SCREEN_WIDTH - 64) / 3,
    backgroundColor: '#2C2C3E',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    color: '#95A5A6',
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  abilityCard: {
    flexDirection: 'row',
    backgroundColor: '#2C2C3E',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  abilityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  abilityIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  abilityInfo: {
    flex: 1,
  },
  abilityName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  abilityType: {
    color: '#95A5A6',
    fontSize: 10,
    marginBottom: 6,
  },
  abilityDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 6,
  },
  abilityStats: {
    flexDirection: 'row',
    gap: 12,
  },
  abilityStatText: {
    color: '#95A5A6',
    fontSize: 12,
  },
  countersContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  counterColumn: {
    flex: 1,
  },
  counterTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  counterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  masteryStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  masteryStatCard: {
    flex: 1,
    backgroundColor: '#2C2C3E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  masteryStatValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  masteryStatLabel: {
    color: '#95A5A6',
    fontSize: 12,
  },
  viewMasteryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498DB',
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewMasteryButtonText: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectButton: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
