// HaloArena - MOBA-lite Game Implementation
// 5v5 role-based gameplay with lanes, objectives, and strategic combat

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performanceMonitor';

// Core game types
interface Vector2 {
  x: number;
  y: number;
}

interface Vector3 extends Vector2 {
  z: number;
}

interface GameBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface Player {
  id: string;
  teamId: 'red' | 'blue';
  role: 'assault' | 'support' | 'tank' | 'sniper' | 'specialist';
  hero: Hero;
  position: Vector3;
  rotation: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  level: number;
  experience: number;
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  lastDamageTime: number;
  respawnTime?: number;
  items: Item[];
  buffs: Buff[];
  isAlive: boolean;
  inputSequence: number;
  lastInputTime: number;
}

interface Hero {
  id: string;
  name: string;
  role: string;
  baseStats: {
    health: number;
    shield: number;
    energy: number;
    speed: number;
    damage: number;
    armor: number;
    range: number;
  };
  abilities: Ability[];
  passiveAbility: PassiveAbility;
  scalingFactors: {
    healthPerLevel: number;
    damagePerLevel: number;
    armorPerLevel: number;
  };
}

interface Ability {
  id: string;
  name: string;
  type: 'active' | 'ultimate';
  cooldown: number;
  energyCost: number;
  range: number;
  damage?: number;
  healAmount?: number;
  duration?: number;
  aoeRadius?: number;
  projectileSpeed?: number;
  castTime: number;
  lastUsed: number;
  upgradeLevel: number;
  maxLevel: number;
}

interface PassiveAbility {
  id: string;
  name: string;
  description: string;
  effect: any; // Simplified for this implementation
}

interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'utility';
  stats: Record<string, number>;
  cost: number;
  tier: number;
  stackable: boolean;
  quantity?: number;
}

interface Buff {
  id: string;
  type: 'damage' | 'speed' | 'healing' | 'shield' | 'debuff';
  value: number;
  duration: number;
  startTime: number;
  source: string; // Player or ability that applied the buff
}

interface Projectile {
  id: string;
  ownerId: string;
  position: Vector3;
  velocity: Vector3;
  damage: number;
  range: number;
  traveledDistance: number;
  createdAt: number;
  type: 'bullet' | 'rocket' | 'grenade' | 'energy';
  aoeRadius?: number;
  piercing?: boolean;
}

interface Lane {
  id: 'top' | 'middle' | 'bottom';
  checkpoints: Vector3[];
  towers: Tower[];
  minions: Minion[];
  nextMinionSpawn: number;
}

interface Tower {
  id: string;
  teamId: 'red' | 'blue';
  position: Vector3;
  health: number;
  maxHealth: number;
  damage: number;
  range: number;
  attackSpeed: number;
  lastAttack: number;
  tier: 1 | 2 | 3; // Base towers = tier 3
  isDestroyed: boolean;
}

interface Minion {
  id: string;
  teamId: 'red' | 'blue';
  lane: 'top' | 'middle' | 'bottom';
  position: Vector3;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  target?: string; // Enemy minion or player ID
  lastAttack: number;
  goldReward: number;
  expReward: number;
  isAlive: boolean;
}

interface Objective {
  id: 'dragon' | 'baron' | 'jungle_boss';
  position: Vector3;
  health: number;
  maxHealth: number;
  damage: number;
  respawnTime: number;
  lastKilledAt?: number;
  killedBy?: string; // Team ID
  buffs: Buff[]; // Buffs granted to killing team
  isAlive: boolean;
  inCombat: boolean;
  combatStartTime?: number;
}

interface MatchState {
  matchId: string;
  gameMode: 'halo-arena';
  state: 'lobby' | 'draft' | 'loading' | 'playing' | 'paused' | 'ended';
  startTime: number;
  gameTime: number;
  maxDuration: number; // 25 minutes default
  players: Map<string, Player>;
  teams: {
    red: {
      score: number;
      towersDestroyed: number;
      killCount: number;
      goldEarned: number;
    };
    blue: {
      score: number;
      towersDestroyed: number;
      killCount: number;
      goldEarned: number;
    };
  };
  lanes: Lane[];
  objectives: Objective[];
  projectiles: Projectile[];
  winner?: 'red' | 'blue';
  endReason?: 'nexus_destroyed' | 'surrender' | 'time_limit';
}

// Game constants
const GAME_CONFIG = {
  // Match settings
  MATCH_DURATION: 25 * 60 * 1000, // 25 minutes
  TEAM_SIZE: 5,

  // Map dimensions (scaled units)
  MAP_BOUNDS: {
    minX: -2000, maxX: 2000,
    minY: -2000, maxY: 2000,
    minZ: 0, maxZ: 100
  } as GameBounds,

  // Gameplay mechanics
  RESPAWN_BASE_TIME: 10000, // 10 seconds base
  RESPAWN_TIME_PER_LEVEL: 2000, // +2s per level
  GOLD_PER_KILL: 300,
  GOLD_PER_ASSIST: 150,
  EXP_PER_KILL: 200,
  EXP_PER_ASSIST: 100,

  // Combat system
  DAMAGE_FALLOFF_START: 0.8, // 80% of max range
  HEADSHOT_MULTIPLIER: 2.0,
  CRIT_CHANCE_BASE: 0.05, // 5%

  // Movement
  MOVEMENT_SPEED_BASE: 300, // units per second
  SPRINT_MULTIPLIER: 1.5,
  JUMP_HEIGHT: 100,
  FALL_DAMAGE_THRESHOLD: 500,

  // Tower mechanics
  TOWER_DAMAGE_SCALING: 1.15, // 15% more damage per attack on same target
  TOWER_AGGRO_RANGE: 800,

  // Minion spawning
  MINION_SPAWN_INTERVAL: 30000, // 30 seconds
  MINIONS_PER_WAVE: 6,

  // Objectives
  DRAGON_RESPAWN: 5 * 60 * 1000, // 5 minutes
  BARON_RESPAWN: 7 * 60 * 1000, // 7 minutes
  OBJECTIVE_TIMEOUT: 10 * 60 * 1000, // 10 minutes combat timeout
};

// Hero definitions
const HERO_ROSTER: Record<string, Omit<Hero, 'id'>> = {
  'spartan-assault': {
    name: 'Spartan Assault',
    role: 'assault',
    baseStats: {
      health: 800, shield: 200, energy: 100,
      speed: 350, damage: 100, armor: 20, range: 400
    },
    abilities: [
      {
        id: 'plasma-rifle', name: 'Plasma Rifle', type: 'active',
        cooldown: 1000, energyCost: 10, range: 400, damage: 80,
        castTime: 100, lastUsed: 0, upgradeLevel: 1, maxLevel: 5
      },
      {
        id: 'frag-grenade', name: 'Frag Grenade', type: 'active',
        cooldown: 8000, energyCost: 30, range: 600, damage: 150,
        aoeRadius: 200, castTime: 800, lastUsed: 0, upgradeLevel: 1, maxLevel: 5
      },
      {
        id: 'spartan-charge', name: 'Spartan Charge', type: 'ultimate',
        cooldown: 60000, energyCost: 80, range: 800, damage: 300,
        castTime: 500, lastUsed: 0, upgradeLevel: 1, maxLevel: 3
      }
    ],
    passiveAbility: {
      id: 'combat-training',
      name: 'Combat Training',
      description: '+15% damage after taking damage for 5 seconds'
    },
    scalingFactors: { healthPerLevel: 80, damagePerLevel: 10, armorPerLevel: 3 }
  },

  'elite-support': {
    name: 'Elite Support',
    role: 'support',
    baseStats: {
      health: 600, shield: 400, energy: 150,
      speed: 300, damage: 60, armor: 15, range: 500
    },
    abilities: [
      {
        id: 'energy-shield', name: 'Energy Shield', type: 'active',
        cooldown: 12000, energyCost: 40, range: 600, healAmount: 200,
        duration: 5000, castTime: 300, lastUsed: 0, upgradeLevel: 1, maxLevel: 5
      },
      {
        id: 'plasma-cannon', name: 'Plasma Cannon', type: 'active',
        cooldown: 2000, energyCost: 20, range: 600, damage: 100,
        castTime: 400, lastUsed: 0, upgradeLevel: 1, maxLevel: 5
      },
      {
        id: 'overshield-burst', name: 'Overshield Burst', type: 'ultimate',
        cooldown: 80000, energyCost: 100, range: 800, healAmount: 400,
        aoeRadius: 400, castTime: 1000, lastUsed: 0, upgradeLevel: 1, maxLevel: 3
      }
    ],
    passiveAbility: {
      id: 'shield-regeneration',
      name: 'Shield Regeneration',
      description: 'Shields regenerate 25% faster'
    },
    scalingFactors: { healthPerLevel: 60, damagePerLevel: 5, armorPerLevel: 2 }
  },

  'brute-tank': {
    name: 'Brute Tank',
    role: 'tank',
    baseStats: {
      health: 1200, shield: 100, energy: 80,
      speed: 250, damage: 80, armor: 40, range: 300
    },
    abilities: [
      {
        id: 'gravity-hammer', name: 'Gravity Hammer', type: 'active',
        cooldown: 3000, energyCost: 25, range: 300, damage: 150,
        aoeRadius: 250, castTime: 600, lastUsed: 0, upgradeLevel: 1, maxLevel: 5
      },
      {
        id: 'berserker-rage', name: 'Berserker Rage', type: 'active',
        cooldown: 20000, energyCost: 40, range: 0, duration: 8000,
        castTime: 200, lastUsed: 0, upgradeLevel: 1, maxLevel: 5
      },
      {
        id: 'seismic-slam', name: 'Seismic Slam', type: 'ultimate',
        cooldown: 90000, energyCost: 60, range: 500, damage: 400,
        aoeRadius: 600, castTime: 1200, lastUsed: 0, upgradeLevel: 1, maxLevel: 3
      }
    ],
    passiveAbility: {
      id: 'thick-skin',
      name: 'Thick Skin',
      description: 'Take 15% less damage from ranged attacks'
    },
    scalingFactors: { healthPerLevel: 120, damagePerLevel: 8, armorPerLevel: 5 }
  }
};

export class HaloArena extends EventEmitter {
  private logger = new Logger('HaloArena');
  private matchState: MatchState;
  private tickRate = 30; // 30 Hz server tick rate
  private tickInterval: number = 1000 / this.tickRate;
  private gameTimer: NodeJS.Timeout | null = null;
  private lastTickTime = 0;

  constructor(matchId: string, playerIds: string[]) {
    super();

    if (playerIds.length !== 10) {
      throw new Error('HaloArena requires exactly 10 players (5v5)');
    }

    this.matchState = this.initializeMatch(matchId, playerIds);
    this.logger.info(`HaloArena match created: ${matchId}`);
  }

  private initializeMatch(matchId: string, playerIds: string[]): MatchState {
    const players = new Map<string, Player>();

    // Assign players to teams and roles
    const teamAssignments = this.assignPlayersToTeams(playerIds);

    for (const [playerId, assignment] of teamAssignments) {
      const hero = this.createHero(assignment.role);
      const spawnPosition = this.getSpawnPosition(assignment.teamId);

      const player: Player = {
        id: playerId,
        teamId: assignment.teamId,
        role: assignment.role,
        hero,
        position: spawnPosition,
        rotation: assignment.teamId === 'red' ? 0 : Math.PI,
        health: hero.baseStats.health,
        maxHealth: hero.baseStats.health,
        shield: hero.baseStats.shield,
        maxShield: hero.baseStats.shield,
        energy: hero.baseStats.energy,
        maxEnergy: hero.baseStats.energy,
        level: 1,
        experience: 0,
        gold: 500, // Starting gold
        kills: 0,
        deaths: 0,
        assists: 0,
        lastDamageTime: 0,
        items: [],
        buffs: [],
        isAlive: true,
        inputSequence: 0,
        lastInputTime: 0,
      };

      players.set(playerId, player);
    }

    // Initialize map structures
    const lanes = this.initializeLanes();
    const objectives = this.initializeObjectives();

    return {
      matchId,
      gameMode: 'halo-arena',
      state: 'loading',
      startTime: Date.now(),
      gameTime: 0,
      maxDuration: GAME_CONFIG.MATCH_DURATION,
      players,
      teams: {
        red: { score: 0, towersDestroyed: 0, killCount: 0, goldEarned: 0 },
        blue: { score: 0, towersDestroyed: 0, killCount: 0, goldEarned: 0 }
      },
      lanes,
      objectives,
      projectiles: [],
    };
  }

  // Public API methods
  public startMatch(): void {
    this.matchState.state = 'playing';
    this.matchState.startTime = Date.now();
    this.lastTickTime = Date.now();

    // Start game loop
    this.gameTimer = setInterval(() => {
      this.gameTick();
    }, this.tickInterval);

    this.logger.info(`HaloArena match started: ${this.matchState.matchId}`);

    // Emit match started event
    this.emit('match_started', {
      matchId: this.matchState.matchId,
      gameMode: this.matchState.gameMode,
      players: Array.from(this.matchState.players.keys()),
      startTime: this.matchState.startTime
    });
  }

  public processPlayerInput(playerId: string, input: any): boolean {
    const player = this.matchState.players.get(playerId);
    if (!player || !player.isAlive) return false;

    // Validate input sequence for anti-cheat
    if (input.sequence <= player.inputSequence) {
      this.logger.warn(`Out of sequence input from ${playerId}: ${input.sequence} <= ${player.inputSequence}`);
      return false;
    }

    player.inputSequence = input.sequence;
    player.lastInputTime = Date.now();

    // Process different input types
    switch (input.type) {
      case 'move':
        return this.processMovementInput(player, input);
      case 'attack':
        return this.processAttackInput(player, input);
      case 'ability':
        return this.processAbilityInput(player, input);
      case 'item':
        return this.processItemInput(player, input);
      default:
        this.logger.warn(`Unknown input type: ${input.type}`);
        return false;
    }
  }

  public getGameState(): any {
    return {
      matchId: this.matchState.matchId,
      state: this.matchState.state,
      gameTime: this.matchState.gameTime,
      players: Array.from(this.matchState.players.values()),
      teams: this.matchState.teams,
      lanes: this.matchState.lanes,
      objectives: this.matchState.objectives,
      winner: this.matchState.winner,
    };
  }

  public pauseMatch(reason: string): void {
    if (this.matchState.state === 'playing') {
      this.matchState.state = 'paused';
      if (this.gameTimer) {
        clearInterval(this.gameTimer);
        this.gameTimer = null;
      }
      this.logger.info(`Match paused: ${reason}`);
      this.emit('match_paused', { matchId: this.matchState.matchId, reason });
    }
  }

  public resumeMatch(): void {
    if (this.matchState.state === 'paused') {
      this.matchState.state = 'playing';
      this.lastTickTime = Date.now();
      this.gameTimer = setInterval(() => {
        this.gameTick();
      }, this.tickInterval);
      this.logger.info('Match resumed');
      this.emit('match_resumed', { matchId: this.matchState.matchId });
    }
  }

  public endMatch(reason: 'nexus_destroyed' | 'surrender' | 'time_limit', winner?: 'red' | 'blue'): void {
    this.matchState.state = 'ended';
    this.matchState.endReason = reason;
    this.matchState.winner = winner;

    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }

    const matchDuration = Date.now() - this.matchState.startTime;
    this.logger.info(`Match ended: ${reason}, Winner: ${winner || 'none'}, Duration: ${matchDuration}ms`);

    // Calculate final stats
    const finalStats = this.calculateFinalStats();

    this.emit('match_ended', {
      matchId: this.matchState.matchId,
      reason,
      winner,
      duration: matchDuration,
      stats: finalStats
    });
  }

  // Core game loop
  private gameTick(): void {
    const now = Date.now();
    const deltaTime = now - this.lastTickTime;
    this.lastTickTime = now;

    PerformanceMonitor.markStart('arena_tick');

    // Update game time
    this.matchState.gameTime += deltaTime;

    // Check for match end conditions
    if (this.checkMatchEndConditions()) {
      PerformanceMonitor.markEnd('arena_tick');
      return;
    }

    // Update all game systems
    this.updatePlayers(deltaTime);
    this.updateProjectiles(deltaTime);
    this.updateMinions(deltaTime);
    this.updateTowers(deltaTime);
    this.updateObjectives(deltaTime);
    this.processCollisions();
    this.spawnMinions();

    PerformanceMonitor.markEnd('arena_tick');

    // Emit tick event for netcode synchronization
    this.emit('game_tick', {
      matchId: this.matchState.matchId,
      tick: Math.floor(this.matchState.gameTime / this.tickInterval),
      gameTime: this.matchState.gameTime,
      deltaTime
    });
  }

  // Input processing
  private processMovementInput(player: Player, input: any): boolean {
    const { direction, magnitude, sprint, jump } = input;

    // Validate movement vector
    if (!direction || !this.isValidVector2(direction)) return false;
    if (magnitude < 0 || magnitude > 1) return false;

    // Calculate movement
    let speed = player.hero.baseStats.speed;
    if (sprint && player.energy >= 5) {
      speed *= GAME_CONFIG.SPRINT_MULTIPLIER;
      player.energy = Math.max(0, player.energy - 5);
    }

    const movement = {
      x: direction.x * magnitude * speed,
      y: direction.y * magnitude * speed,
      z: jump && player.position.z <= 10 ? GAME_CONFIG.JUMP_HEIGHT : 0
    };

    // Apply movement with bounds checking
    const newPosition = this.applyMovementWithBounds(player.position, movement);
    player.position = newPosition;
    player.rotation = Math.atan2(direction.y, direction.x);

    return true;
  }

  private processAttackInput(player: Player, input: any): boolean {
    const { target, position } = input;

    // Basic attack cooldown check
    const basicAttackCooldown = 1000 / (player.hero.baseStats.damage / 100); // Simplified
    if (Date.now() - player.lastInputTime < basicAttackCooldown) return false;

    // Calculate damage and range
    const damage = this.calculateDamage(player, null);
    const range = player.hero.baseStats.range;

    let targetPosition: Vector3;
    if (target) {
      const targetPlayer = this.matchState.players.get(target);
      if (!targetPlayer) return false;
      targetPosition = targetPlayer.position;
    } else if (position) {
      targetPosition = position;
    } else {
      return false;
    }

    // Range check
    const distance = this.calculateDistance(player.position, targetPosition);
    if (distance > range) return false;

    // Create projectile for basic attack
    const projectile: Projectile = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ownerId: player.id,
      position: { ...player.position },
      velocity: this.calculateProjectileVelocity(player.position, targetPosition, 800),
      damage,
      range,
      traveledDistance: 0,
      createdAt: Date.now(),
      type: 'bullet'
    };

    this.matchState.projectiles.push(projectile);
    return true;
  }

  private processAbilityInput(player: Player, input: any): boolean {
    const { abilityId, target, position } = input;

    const ability = player.hero.abilities.find(a => a.id === abilityId);
    if (!ability) return false;

    // Cooldown check
    if (Date.now() - ability.lastUsed < ability.cooldown) return false;

    // Energy check
    if (player.energy < ability.energyCost) return false;

    // Range and target validation
    let targetPosition: Vector3;
    if (target) {
      const targetEntity = this.findEntity(target);
      if (!targetEntity) return false;
      targetPosition = targetEntity.position;
    } else if (position) {
      targetPosition = position;
    } else {
      targetPosition = player.position; // Self-target
    }

    const distance = this.calculateDistance(player.position, targetPosition);
    if (distance > ability.range) return false;

    // Cast the ability
    this.castAbility(player, ability, targetPosition, target);
    return true;
  }

  private processItemInput(player: Player, input: any): boolean {
    const { itemId, target } = input;

    const item = player.items.find(i => i.id === itemId);
    if (!item) return false;

    // Use the item
    return this.useItem(player, item, target);
  }

  // Combat system
  private calculateDamage(attacker: Player, ability: Ability | null): number {
    let baseDamage = ability ? ability.damage || 0 : attacker.hero.baseStats.damage;

    // Apply level scaling
    baseDamage += attacker.level * attacker.hero.scalingFactors.damagePerLevel;

    // Apply item bonuses
    for (const item of attacker.items) {
      baseDamage += item.stats.damage || 0;
    }

    // Apply buffs
    for (const buff of attacker.buffs) {
      if (buff.type === 'damage') {
        baseDamage += buff.value;
      }
    }

    return Math.floor(baseDamage);
  }

  private applyDamage(target: Player | Minion | Tower, damage: number, source: Player): boolean {
    // Apply armor reduction
    let finalDamage = damage;
    if ('hero' in target) {
      const armor = target.hero.baseStats.armor + (target.level * target.hero.scalingFactors.armorPerLevel);
      finalDamage = damage * (100 / (100 + armor));
    }

    // Apply to shields first, then health
    if ('shield' in target && target.shield > 0) {
      const shieldDamage = Math.min(target.shield, finalDamage);
      target.shield -= shieldDamage;
      finalDamage -= shieldDamage;
    }

    if (finalDamage > 0) {
      target.health -= finalDamage;
    }

    // Check for kill
    if (target.health <= 0) {
      this.handleEntityDeath(target, source);
      return true;
    }

    return false;
  }

  private handleEntityDeath(target: Player | Minion | Tower, killer: Player): void {
    if ('isAlive' in target) {
      target.isAlive = false;
    }

    // Handle player death
    if ('hero' in target) {
      const targetPlayer = target as Player;
      targetPlayer.deaths++;
      targetPlayer.respawnTime = Date.now() + GAME_CONFIG.RESPAWN_BASE_TIME +
        (targetPlayer.level * GAME_CONFIG.RESPAWN_TIME_PER_LEVEL);

      // Award killer
      killer.kills++;
      killer.gold += GAME_CONFIG.GOLD_PER_KILL;
      killer.experience += GAME_CONFIG.EXP_PER_KILL;
      this.matchState.teams[killer.teamId].killCount++;

      // Award assists to nearby teammates
      this.awardAssists(targetPlayer, killer);

      this.logger.info(`Player ${targetPlayer.id} killed by ${killer.id}`);

      this.emit('player_killed', {
        victimId: targetPlayer.id,
        killerId: killer.id,
        position: targetPlayer.position,
        gameTime: this.matchState.gameTime
      });
    }

    // Handle minion death
    if ('lane' in target) {
      const minion = target as Minion;
      killer.gold += minion.goldReward;
      killer.experience += minion.expReward;
    }

    // Handle tower death
    if ('tier' in target) {
      const tower = target as Tower;
      tower.isDestroyed = true;
      this.matchState.teams[killer.teamId].towersDestroyed++;
      this.matchState.teams[killer.teamId].goldEarned += 500; // Team gold for tower

      this.emit('tower_destroyed', {
        towerId: tower.id,
        destroyedBy: killer.id,
        teamId: killer.teamId,
        position: tower.position
      });
    }
  }

  // Game systems updates
  private updatePlayers(deltaTime: number): void {
    for (const player of this.matchState.players.values()) {
      // Regenerate energy
      if (player.energy < player.maxEnergy) {
        player.energy = Math.min(player.maxEnergy, player.energy + (deltaTime / 100));
      }

      // Regenerate shields (if not recently damaged)
      if (Date.now() - player.lastDamageTime > 5000 && player.shield < player.maxShield) {
        player.shield = Math.min(player.maxShield, player.shield + (deltaTime / 50));
      }

      // Handle respawn
      if (!player.isAlive && player.respawnTime && Date.now() >= player.respawnTime) {
        this.respawnPlayer(player);
      }

      // Update buffs
      this.updatePlayerBuffs(player, deltaTime);

      // Check for level up
      this.checkLevelUp(player);
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.matchState.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.matchState.projectiles[i];

      // Update position
      projectile.position.x += projectile.velocity.x * deltaTime / 1000;
      projectile.position.y += projectile.velocity.y * deltaTime / 1000;
      projectile.position.z += projectile.velocity.z * deltaTime / 1000;

      projectile.traveledDistance += this.calculateDistance(
        { x: 0, y: 0, z: 0 },
        {
          x: projectile.velocity.x * deltaTime / 1000,
          y: projectile.velocity.y * deltaTime / 1000,
          z: projectile.velocity.z * deltaTime / 1000
        }
      );

      // Remove if out of bounds or traveled max distance
      if (projectile.traveledDistance > projectile.range ||
          !this.isPositionInBounds(projectile.position)) {
        this.matchState.projectiles.splice(i, 1);
        continue;
      }

      // Check for hits
      if (this.checkProjectileHits(projectile)) {
        this.matchState.projectiles.splice(i, 1);
      }
    }
  }

  private updateMinions(deltaTime: number): void {
    for (const lane of this.matchState.lanes) {
      for (let i = lane.minions.length - 1; i >= 0; i--) {
        const minion = lane.minions[i];

        if (!minion.isAlive) {
          lane.minions.splice(i, 1);
          continue;
        }

        // Basic AI: move toward enemy nexus
        this.updateMinionAI(minion, deltaTime);
      }
    }
  }

  private updateTowers(deltaTime: number): void {
    for (const lane of this.matchState.lanes) {
      for (const tower of lane.towers) {
        if (tower.isDestroyed) continue;

        // Find targets in range
        const targets = this.findTargetsInRange(tower.position, tower.range,
          tower.teamId === 'red' ? 'blue' : 'red');

        if (targets.length > 0) {
          // Attack closest target
          const target = targets[0];
          if (Date.now() - tower.lastAttack >= (1000 / tower.attackSpeed)) {
            this.towerAttack(tower, target);
            tower.lastAttack = Date.now();
          }
        }
      }
    }
  }

  private updateObjectives(deltaTime: number): void {
    for (const objective of this.matchState.objectives) {
      if (!objective.isAlive && objective.lastKilledAt) {
        // Check for respawn
        if (Date.now() - objective.lastKilledAt >= objective.respawnTime) {
          objective.isAlive = true;
          objective.health = objective.maxHealth;
          objective.inCombat = false;
          delete objective.lastKilledAt;
          delete objective.combatStartTime;
        }
      } else if (objective.isAlive && objective.inCombat) {
        // Combat timeout check
        if (objective.combatStartTime &&
            Date.now() - objective.combatStartTime > GAME_CONFIG.OBJECTIVE_TIMEOUT) {
          objective.inCombat = false;
          objective.health = objective.maxHealth; // Reset health
          delete objective.combatStartTime;
        }
      }
    }
  }

  // Utility methods
  private assignPlayersToTeams(playerIds: string[]): Map<string, {teamId: 'red' | 'blue', role: Player['role']}> {
    const assignments = new Map();
    const roles: Player['role'][] = ['assault', 'support', 'tank', 'sniper', 'specialist'];

    // Shuffle players for random assignment
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i++) {
      assignments.set(shuffled[i], {
        teamId: i < 5 ? 'red' : 'blue',
        role: roles[i % 5]
      });
    }

    return assignments;
  }

  private createHero(role: Player['role']): Hero {
    const heroKey = `${role === 'assault' ? 'spartan-assault' :
                     role === 'support' ? 'elite-support' : 'brute-tank'}`;
    const heroTemplate = HERO_ROSTER[heroKey];

    return {
      id: heroKey,
      ...heroTemplate
    };
  }

  private getSpawnPosition(teamId: 'red' | 'blue'): Vector3 {
    const baseX = teamId === 'red' ? -1800 : 1800;
    const baseY = 0;
    return { x: baseX, y: baseY, z: 10 };
  }

  private initializeLanes(): Lane[] {
    return [
      {
        id: 'top',
        checkpoints: [
          { x: -1500, y: 1000, z: 0 },
          { x: 0, y: 1000, z: 0 },
          { x: 1500, y: 1000, z: 0 }
        ],
        towers: this.createLaneTowers('top'),
        minions: [],
        nextMinionSpawn: Date.now() + GAME_CONFIG.MINION_SPAWN_INTERVAL
      },
      {
        id: 'middle',
        checkpoints: [
          { x: -1500, y: 0, z: 0 },
          { x: 0, y: 0, z: 0 },
          { x: 1500, y: 0, z: 0 }
        ],
        towers: this.createLaneTowers('middle'),
        minions: [],
        nextMinionSpawn: Date.now() + GAME_CONFIG.MINION_SPAWN_INTERVAL
      },
      {
        id: 'bottom',
        checkpoints: [
          { x: -1500, y: -1000, z: 0 },
          { x: 0, y: -1000, z: 0 },
          { x: 1500, y: -1000, z: 0 }
        ],
        towers: this.createLaneTowers('bottom'),
        minions: [],
        nextMinionSpawn: Date.now() + GAME_CONFIG.MINION_SPAWN_INTERVAL
      }
    ];
  }

  private createLaneTowers(laneId: string): Tower[] {
    const towers: Tower[] = [];
    const yOffset = laneId === 'top' ? 1000 : laneId === 'bottom' ? -1000 : 0;

    // Red team towers
    towers.push(
      {
        id: `${laneId}-red-1`, teamId: 'red', tier: 1,
        position: { x: -1200, y: yOffset, z: 0 },
        health: 2000, maxHealth: 2000, damage: 150, range: 600,
        attackSpeed: 1.0, lastAttack: 0, isDestroyed: false
      },
      {
        id: `${laneId}-red-2`, teamId: 'red', tier: 2,
        position: { x: -600, y: yOffset, z: 0 },
        health: 3000, maxHealth: 3000, damage: 200, range: 650,
        attackSpeed: 1.2, lastAttack: 0, isDestroyed: false
      }
    );

    // Blue team towers
    towers.push(
      {
        id: `${laneId}-blue-1`, teamId: 'blue', tier: 1,
        position: { x: 1200, y: yOffset, z: 0 },
        health: 2000, maxHealth: 2000, damage: 150, range: 600,
        attackSpeed: 1.0, lastAttack: 0, isDestroyed: false
      },
      {
        id: `${laneId}-blue-2`, teamId: 'blue', tier: 2,
        position: { x: 600, y: yOffset, z: 0 },
        health: 3000, maxHealth: 3000, damage: 200, range: 650,
        attackSpeed: 1.2, lastAttack: 0, isDestroyed: false
      }
    );

    return towers;
  }

  private initializeObjectives(): Objective[] {
    return [
      {
        id: 'dragon',
        position: { x: -800, y: -800, z: 0 },
        health: 5000, maxHealth: 5000, damage: 300,
        respawnTime: GAME_CONFIG.DRAGON_RESPAWN,
        buffs: [
          {
            id: 'dragon-buff', type: 'damage', value: 50, duration: 120000,
            startTime: 0, source: 'dragon'
          }
        ],
        isAlive: true, inCombat: false
      },
      {
        id: 'baron',
        position: { x: 800, y: 800, z: 0 },
        health: 8000, maxHealth: 8000, damage: 400,
        respawnTime: GAME_CONFIG.BARON_RESPAWN,
        buffs: [
          {
            id: 'baron-buff', type: 'damage', value: 100, duration: 180000,
            startTime: 0, source: 'baron'
          }
        ],
        isAlive: true, inCombat: false
      }
    ];
  }

  private checkMatchEndConditions(): boolean {
    // Check for nexus destruction (simplified - when all towers destroyed)
    const redTowersLeft = this.matchState.lanes.flatMap(l => l.towers)
      .filter(t => t.teamId === 'red' && !t.isDestroyed).length;
    const blueTowersLeft = this.matchState.lanes.flatMap(l => l.towers)
      .filter(t => t.teamId === 'blue' && !t.isDestroyed).length;

    if (redTowersLeft === 0) {
      this.endMatch('nexus_destroyed', 'blue');
      return true;
    }
    if (blueTowersLeft === 0) {
      this.endMatch('nexus_destroyed', 'red');
      return true;
    }

    // Check for time limit
    if (this.matchState.gameTime >= this.matchState.maxDuration) {
      const winner = this.matchState.teams.red.score > this.matchState.teams.blue.score ? 'red' : 'blue';
      this.endMatch('time_limit', winner);
      return true;
    }

    return false;
  }

  private calculateFinalStats(): any {
    const playerStats = Array.from(this.matchState.players.values()).map(player => ({
      playerId: player.id,
      teamId: player.teamId,
      role: player.role,
      kills: player.kills,
      deaths: player.deaths,
      assists: player.assists,
      level: player.level,
      gold: player.gold,
      damage: 0, // Would track during match
      healing: 0, // Would track during match
    }));

    return {
      players: playerStats,
      teams: this.matchState.teams,
      duration: this.matchState.gameTime,
      winner: this.matchState.winner,
    };
  }

  // Helper methods
  private isValidVector2(vector: any): boolean {
    return vector &&
           typeof vector.x === 'number' &&
           typeof vector.y === 'number' &&
           !isNaN(vector.x) && !isNaN(vector.y);
  }

  private applyMovementWithBounds(position: Vector3, movement: any): Vector3 {
    const newPos = {
      x: Math.max(GAME_CONFIG.MAP_BOUNDS.minX,
          Math.min(GAME_CONFIG.MAP_BOUNDS.maxX, position.x + movement.x)),
      y: Math.max(GAME_CONFIG.MAP_BOUNDS.minY,
          Math.min(GAME_CONFIG.MAP_BOUNDS.maxY, position.y + movement.y)),
      z: Math.max(GAME_CONFIG.MAP_BOUNDS.minZ,
          Math.min(GAME_CONFIG.MAP_BOUNDS.maxZ, position.z + movement.z))
    };
    return newPos;
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculateProjectileVelocity(from: Vector3, to: Vector3, speed: number): Vector3 {
    const direction = {
      x: to.x - from.x,
      y: to.y - from.y,
      z: to.z - from.z
    };

    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);

    return {
      x: (direction.x / magnitude) * speed,
      y: (direction.y / magnitude) * speed,
      z: (direction.z / magnitude) * speed
    };
  }

  private isPositionInBounds(position: Vector3): boolean {
    return position.x >= GAME_CONFIG.MAP_BOUNDS.minX &&
           position.x <= GAME_CONFIG.MAP_BOUNDS.maxX &&
           position.y >= GAME_CONFIG.MAP_BOUNDS.minY &&
           position.y <= GAME_CONFIG.MAP_BOUNDS.maxY &&
           position.z >= GAME_CONFIG.MAP_BOUNDS.minZ &&
           position.z <= GAME_CONFIG.MAP_BOUNDS.maxZ;
  }

  private findEntity(id: string): { position: Vector3 } | null {
    // Check players
    const player = this.matchState.players.get(id);
    if (player) return player;

    // Check minions
    for (const lane of this.matchState.lanes) {
      const minion = lane.minions.find(m => m.id === id);
      if (minion) return minion;
    }

    // Check towers
    for (const lane of this.matchState.lanes) {
      const tower = lane.towers.find(t => t.id === id);
      if (tower) return tower;
    }

    return null;
  }

  private castAbility(player: Player, ability: Ability, targetPosition: Vector3, targetId?: string): void {
    // Consume energy and set cooldown
    player.energy -= ability.energyCost;
    ability.lastUsed = Date.now();

    // Create ability effects based on type
    switch (ability.id) {
      case 'plasma-rifle':
        this.createProjectile(player, targetPosition, ability);
        break;
      case 'frag-grenade':
        this.createAreaEffect(player, targetPosition, ability);
        break;
      case 'energy-shield':
        this.applyHealing(player, targetId, ability);
        break;
      default:
        this.logger.warn(`Unknown ability: ${ability.id}`);
    }

    this.emit('ability_cast', {
      playerId: player.id,
      abilityId: ability.id,
      targetPosition,
      targetId,
      gameTime: this.matchState.gameTime
    });
  }

  private useItem(player: Player, item: Item, targetId?: string): boolean {
    // Simplified item usage
    if (item.type === 'consumable') {
      // Apply item effects
      if (item.stats.health) {
        player.health = Math.min(player.maxHealth, player.health + item.stats.health);
      }
      if (item.stats.energy) {
        player.energy = Math.min(player.maxEnergy, player.energy + item.stats.energy);
      }

      // Remove consumable item
      if (item.stackable && item.quantity! > 1) {
        item.quantity!--;
      } else {
        const index = player.items.indexOf(item);
        player.items.splice(index, 1);
      }

      return true;
    }

    return false;
  }

  private awardAssists(victim: Player, killer: Player): void {
    const assistRange = 800; // Units

    for (const player of this.matchState.players.values()) {
      if (player.teamId === killer.teamId && player.id !== killer.id) {
        const distance = this.calculateDistance(player.position, victim.position);
        if (distance <= assistRange) {
          player.assists++;
          player.gold += GAME_CONFIG.GOLD_PER_ASSIST;
          player.experience += GAME_CONFIG.EXP_PER_ASSIST;
        }
      }
    }
  }

  private respawnPlayer(player: Player): void {
    player.isAlive = true;
    player.health = player.maxHealth;
    player.shield = player.maxShield;
    player.energy = player.maxEnergy;
    player.position = this.getSpawnPosition(player.teamId);
    delete player.respawnTime;

    this.emit('player_respawned', {
      playerId: player.id,
      position: player.position,
      gameTime: this.matchState.gameTime
    });
  }

  private updatePlayerBuffs(player: Player, deltaTime: number): void {
    for (let i = player.buffs.length - 1; i >= 0; i--) {
      const buff = player.buffs[i];
      if (Date.now() - buff.startTime >= buff.duration) {
        player.buffs.splice(i, 1);
      }
    }
  }

  private checkLevelUp(player: Player): void {
    const expRequired = player.level * 1000; // Simplified progression
    if (player.experience >= expRequired) {
      player.level++;
      player.experience -= expRequired;

      // Level up bonuses
      player.maxHealth += player.hero.scalingFactors.healthPerLevel;
      player.health += player.hero.scalingFactors.healthPerLevel;

      this.emit('player_level_up', {
        playerId: player.id,
        newLevel: player.level,
        gameTime: this.matchState.gameTime
      });
    }
  }

  private spawnMinions(): void {
    const now = Date.now();

    for (const lane of this.matchState.lanes) {
      if (now >= lane.nextMinionSpawn) {
        // Spawn minion wave
        for (let i = 0; i < GAME_CONFIG.MINIONS_PER_WAVE; i++) {
          // Red team minions
          lane.minions.push(this.createMinion('red', lane.id));
          // Blue team minions
          lane.minions.push(this.createMinion('blue', lane.id));
        }

        lane.nextMinionSpawn = now + GAME_CONFIG.MINION_SPAWN_INTERVAL;
      }
    }
  }

  private createMinion(teamId: 'red' | 'blue', laneId: string): Minion {
    const spawnX = teamId === 'red' ? -1800 : 1800;
    const spawnY = laneId === 'top' ? 1000 : laneId === 'bottom' ? -1000 : 0;

    return {
      id: `minion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      teamId,
      lane: laneId as 'top' | 'middle' | 'bottom',
      position: { x: spawnX, y: spawnY, z: 0 },
      health: 200,
      maxHealth: 200,
      damage: 50,
      speed: 150,
      lastAttack: 0,
      goldReward: 20,
      expReward: 15,
      isAlive: true
    };
  }

  private updateMinionAI(minion: Minion, deltaTime: number): void {
    // Simple AI: move towards enemy nexus
    const targetX = minion.teamId === 'red' ? 1800 : -1800;
    const direction = targetX > minion.position.x ? 1 : -1;

    minion.position.x += direction * minion.speed * deltaTime / 1000;

    // Attack nearby enemies
    const enemies = this.findTargetsInRange(minion.position, 200,
      minion.teamId === 'red' ? 'blue' : 'red');

    if (enemies.length > 0 && Date.now() - minion.lastAttack >= 1000) {
      // Simple minion attack
      minion.lastAttack = Date.now();
    }
  }

  private findTargetsInRange(position: Vector3, range: number, enemyTeam: 'red' | 'blue'): any[] {
    const targets = [];

    // Find enemy players
    for (const player of this.matchState.players.values()) {
      if (player.teamId === enemyTeam && player.isAlive) {
        const distance = this.calculateDistance(position, player.position);
        if (distance <= range) {
          targets.push(player);
        }
      }
    }

    // Find enemy minions
    for (const lane of this.matchState.lanes) {
      for (const minion of lane.minions) {
        if (minion.teamId === enemyTeam && minion.isAlive) {
          const distance = this.calculateDistance(position, minion.position);
          if (distance <= range) {
            targets.push(minion);
          }
        }
      }
    }

    // Sort by distance
    targets.sort((a, b) =>
      this.calculateDistance(position, a.position) -
      this.calculateDistance(position, b.position)
    );

    return targets;
  }

  private towerAttack(tower: Tower, target: any): void {
    const damage = tower.damage;

    if ('hero' in target) {
      this.applyDamage(target, damage, { id: tower.id } as Player);
    }
  }

  private processCollisions(): void {
    // Check projectile collisions
    for (let i = this.matchState.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.matchState.projectiles[i];
      if (this.checkProjectileHits(projectile)) {
        this.matchState.projectiles.splice(i, 1);
      }
    }
  }

  private checkProjectileHits(projectile: Projectile): boolean {
    const owner = this.matchState.players.get(projectile.ownerId);
    if (!owner) return true; // Remove orphaned projectiles

    // Check hits against enemy players
    for (const player of this.matchState.players.values()) {
      if (player.teamId !== owner.teamId && player.isAlive) {
        const distance = this.calculateDistance(projectile.position, player.position);
        if (distance <= 50) { // Hit radius
          this.applyDamage(player, projectile.damage, owner);
          return true; // Projectile consumed
        }
      }
    }

    // Check hits against enemy minions
    for (const lane of this.matchState.lanes) {
      for (const minion of lane.minions) {
        if (minion.teamId !== owner.teamId && minion.isAlive) {
          const distance = this.calculateDistance(projectile.position, minion.position);
          if (distance <= 30) {
            this.applyDamage(minion, projectile.damage, owner);
            return true;
          }
        }
      }
    }

    return false;
  }

  private createProjectile(player: Player, targetPosition: Vector3, ability: Ability): void {
    const projectile: Projectile = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ownerId: player.id,
      position: { ...player.position },
      velocity: this.calculateProjectileVelocity(player.position, targetPosition,
        ability.projectileSpeed || 800),
      damage: ability.damage || 100,
      range: ability.range || 400,
      traveledDistance: 0,
      createdAt: Date.now(),
      type: 'energy',
      piercing: false
    };

    this.matchState.projectiles.push(projectile);
  }

  private createAreaEffect(player: Player, targetPosition: Vector3, ability: Ability): void {
    // Create delayed explosion
    setTimeout(() => {
      const targets = this.findTargetsInRange(targetPosition, ability.aoeRadius || 200,
        player.teamId === 'red' ? 'blue' : 'red');

      for (const target of targets) {
        this.applyDamage(target, ability.damage || 150, player);
      }

      this.emit('area_effect', {
        position: targetPosition,
        radius: ability.aoeRadius,
        damage: ability.damage,
        playerId: player.id
      });
    }, 800); // Grenade delay
  }

  private applyHealing(caster: Player, targetId: string | undefined, ability: Ability): void {
    let target = caster; // Self-heal by default

    if (targetId) {
      const targetPlayer = this.matchState.players.get(targetId);
      if (targetPlayer && targetPlayer.teamId === caster.teamId) {
        target = targetPlayer;
      }
    }

    const healAmount = ability.healAmount || 100;
    target.health = Math.min(target.maxHealth, target.health + healAmount);
    target.shield = Math.min(target.maxShield, target.shield + healAmount);

    this.emit('player_healed', {
      targetId: target.id,
      casterId: caster.id,
      amount: healAmount
    });
  }

  public cleanup(): void {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    this.removeAllListeners();
    this.logger.info(`HaloArena match cleaned up: ${this.matchState.matchId}`);
  }
}