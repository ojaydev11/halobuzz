// HaloRoyale - Battle Royale Game Implementation
// 60-player last-man-standing with shrinking zones, loot system, and dynamic gameplay

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performanceMonitor';

// Core game types
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface GameBounds {
  center: Vector3;
  radius: number;
  nextCenter?: Vector3;
  nextRadius?: number;
  shrinkStartTime?: number;
  shrinkDuration: number;
}

interface Player {
  id: string;
  position: Vector3;
  rotation: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  isAlive: boolean;
  isDown: boolean; // Knocked down but not eliminated
  downTime?: number;
  reviveProgress: number;
  revivedBy?: string;

  // Equipment
  primaryWeapon?: Weapon;
  secondaryWeapon?: Weapon;
  consumables: Consumable[];
  armor?: Armor;
  backpack?: Equipment;

  // Stats
  kills: number;
  damage: number;
  placement: number;
  survivalTime: number;

  // Movement & State
  isMoving: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isInVehicle: boolean;
  vehicleId?: string;

  // Network
  inputSequence: number;
  lastInputTime: number;
  ping: number;

  // Zone effects
  inZone: boolean;
  zoneEntryTime?: number;
  zoneDamageAccumulator: number;
}

interface Weapon {
  id: string;
  name: string;
  type: 'assault_rifle' | 'sniper_rifle' | 'shotgun' | 'pistol' | 'rocket_launcher';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  damage: number;
  fireRate: number; // rounds per minute
  range: number;
  accuracy: number; // 0-1
  reloadTime: number;
  magSize: number;
  currentAmmo: number;
  reserveAmmo: number;
  attachments: WeaponAttachment[];
  lastFired: number;
  reloadStartTime?: number;
}

interface WeaponAttachment {
  id: string;
  type: 'scope' | 'barrel' | 'grip' | 'magazine';
  name: string;
  effects: {
    damage?: number;
    accuracy?: number;
    range?: number;
    reloadTime?: number;
    magSize?: number;
  };
}

interface Consumable {
  id: string;
  name: string;
  type: 'health_kit' | 'shield_cell' | 'energy_drink' | 'grenade';
  rarity: 'common' | 'rare' | 'epic';
  quantity: number;
  useTime: number; // milliseconds to consume
  effect: {
    health?: number;
    shield?: number;
    speed?: number;
    duration?: number;
  };
}

interface Armor {
  id: string;
  name: string;
  type: 'helmet' | 'chest' | 'legs';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  protection: number; // damage reduction percentage
  durability: number;
  maxDurability: number;
}

interface Equipment {
  id: string;
  name: string;
  type: 'backpack' | 'utility';
  capacity?: number; // for backpacks
  effect?: any; // for utility items
}

interface LootItem {
  id: string;
  position: Vector3;
  item: Weapon | Consumable | Armor | Equipment;
  spawnTime: number;
  despawnTime?: number;
  highlighted: boolean; // for rarity highlighting
}

interface Vehicle {
  id: string;
  type: 'mongoose' | 'warthog' | 'scorpion';
  position: Vector3;
  rotation: number;
  health: number;
  maxHealth: number;
  speed: number;
  occupants: Map<string, 'driver' | 'passenger' | 'gunner'>;
  maxOccupants: number;
  fuel: number;
  maxFuel: number;
  lastUsed: number;
}

interface Building {
  id: string;
  type: 'house' | 'warehouse' | 'tower' | 'bunker';
  position: Vector3;
  bounds: {
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
  };
  lootSpawns: LootSpawn[];
  isDestroyed: boolean;
}

interface LootSpawn {
  id: string;
  position: Vector3;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'weapon' | 'consumable' | 'armor' | 'attachment';
  cooldown: number;
  lastSpawned: number;
  currentLoot?: LootItem;
}

interface MatchState {
  matchId: string;
  gameMode: 'halo-royale';
  phase: 'lobby' | 'drop_phase' | 'playing' | 'final_circle' | 'ended';
  startTime: number;
  gameTime: number;

  // Players and teams
  players: Map<string, Player>;
  teams: Map<string, string[]>; // teamId -> playerIds
  alivePlayers: Set<string>;
  spectators: Set<string>;

  // Map and zone
  mapBounds: GameBounds;
  zoneDamage: number;
  zonePhase: number;
  nextZoneShrink: number;

  // World state
  lootItems: Map<string, LootItem>;
  vehicles: Map<string, Vehicle>;
  buildings: Building[];
  projectiles: Projectile[];

  // Match progression
  killFeed: KillEvent[];
  winner?: string;
  winnerType: 'solo' | 'team';
  playersRemaining: number;

  // Drop phase
  dropShip?: {
    position: Vector3;
    direction: Vector3;
    speed: number;
    playersOnBoard: Set<string>;
  };
}

interface Projectile {
  id: string;
  ownerId: string;
  weaponType: string;
  position: Vector3;
  velocity: Vector3;
  damage: number;
  range: number;
  traveledDistance: number;
  createdAt: number;
  piercing: boolean;
  explosive: boolean;
  explosionRadius?: number;
}

interface KillEvent {
  killerId?: string;
  victimId: string;
  weapon?: string;
  isHeadshot: boolean;
  isKnockdown: boolean; // vs full elimination
  distance: number;
  timestamp: number;
}

interface ZoneConfig {
  phase: number;
  waitTime: number; // before shrink starts
  shrinkDuration: number;
  damagePerSecond: number;
  finalRadius: number;
}

// Game constants
const GAME_CONFIG = {
  // Match settings
  MAX_PLAYERS: 60,
  TEAM_SIZE: 3, // Squad mode (can be 1 for solo)
  MATCH_MAX_DURATION: 30 * 60 * 1000, // 30 minutes

  // Map settings
  MAP_SIZE: 4000, // 4km x 4km map
  INITIAL_ZONE_RADIUS: 2000,

  // Player settings
  MAX_HEALTH: 100,
  MAX_SHIELD: 100,
  MOVEMENT_SPEED: 300,
  SPRINT_MULTIPLIER: 1.6,
  CROUCH_MULTIPLIER: 0.6,

  // Combat
  HEADSHOT_MULTIPLIER: 2.0,
  DOWN_HEALTH: 25, // Health when knocked down
  REVIVE_TIME: 8000, // 8 seconds to revive
  BLEED_OUT_TIME: 90000, // 90 seconds until elimination

  // Loot and economy
  LOOT_DESPAWN_TIME: 300000, // 5 minutes
  BUILDING_LOOT_COOLDOWN: 180000, // 3 minutes between spawns

  // Vehicles
  VEHICLE_DECAY_TIME: 600000, // 10 minutes unused
  FUEL_CONSUMPTION_RATE: 1.0, // per second while driving

  // Zone progression
  ZONE_CONFIGS: [
    { phase: 1, waitTime: 60000, shrinkDuration: 180000, damagePerSecond: 1, finalRadius: 1400 },
    { phase: 2, waitTime: 30000, shrinkDuration: 120000, damagePerSecond: 2, finalRadius: 1000 },
    { phase: 3, waitTime: 30000, shrinkDuration: 120000, damagePerSecond: 5, finalRadius: 700 },
    { phase: 4, waitTime: 20000, shrinkDuration: 90000, damagePerSecond: 10, finalRadius: 400 },
    { phase: 5, waitTime: 20000, shrinkDuration: 90000, damagePerSecond: 20, finalRadius: 200 },
    { phase: 6, waitTime: 15000, shrinkDuration: 60000, damagePerSecond: 25, finalRadius: 100 },
    { phase: 7, waitTime: 10000, shrinkDuration: 60000, damagePerSecond: 30, finalRadius: 50 },
    { phase: 8, waitTime: 10000, shrinkDuration: 30000, damagePerSecond: 40, finalRadius: 0 }
  ] as ZoneConfig[]
};

// Weapon definitions
const WEAPON_ROSTER = {
  // Assault Rifles
  'ma5b_assault_rifle': {
    name: 'MA5B Assault Rifle',
    type: 'assault_rifle' as const,
    damage: 24,
    fireRate: 600,
    range: 400,
    accuracy: 0.75,
    reloadTime: 2500,
    magSize: 32
  },

  'br55_battle_rifle': {
    name: 'BR55 Battle Rifle',
    type: 'assault_rifle' as const,
    damage: 36,
    fireRate: 180,
    range: 600,
    accuracy: 0.9,
    reloadTime: 2800,
    magSize: 36
  },

  // Sniper Rifles
  'srs99_sniper': {
    name: 'SRS99 Sniper Rifle',
    type: 'sniper_rifle' as const,
    damage: 150,
    fireRate: 30,
    range: 1200,
    accuracy: 0.95,
    reloadTime: 4000,
    magSize: 4
  },

  // Shotguns
  'shotgun': {
    name: 'M90 Shotgun',
    type: 'shotgun' as const,
    damage: 80,
    fireRate: 60,
    range: 100,
    accuracy: 0.6,
    reloadTime: 3500,
    magSize: 8
  },

  // Pistols
  'magnum': {
    name: 'M6G Magnum',
    type: 'pistol' as const,
    damage: 45,
    fireRate: 180,
    range: 300,
    accuracy: 0.8,
    reloadTime: 2000,
    magSize: 12
  },

  // Heavy weapons
  'rocket_launcher': {
    name: 'M41 Rocket Launcher',
    type: 'rocket_launcher' as const,
    damage: 200,
    fireRate: 30,
    range: 600,
    accuracy: 0.9,
    reloadTime: 5000,
    magSize: 2
  }
};

export class HaloRoyale extends EventEmitter {
  private logger = new Logger('HaloRoyale');
  private matchState: MatchState;
  private tickRate = 20; // 20 Hz for battle royale (lower for 60 players)
  private tickInterval: number = 1000 / this.tickRate;
  private gameTimer: NodeJS.Timeout | null = null;
  private zoneTimer: NodeJS.Timeout | null = null;
  private lastTickTime = 0;

  constructor(matchId: string, playerIds: string[]) {
    super();

    if (playerIds.length > GAME_CONFIG.MAX_PLAYERS) {
      throw new Error(`HaloRoyale supports maximum ${GAME_CONFIG.MAX_PLAYERS} players`);
    }

    this.matchState = this.initializeMatch(matchId, playerIds);
    this.logger.info(`HaloRoyale match created: ${matchId} (${playerIds.length} players)`);
  }

  private initializeMatch(matchId: string, playerIds: string[]): MatchState {
    const players = new Map<string, Player>();
    const teams = new Map<string, string[]>();
    const alivePlayers = new Set<string>();

    // Create teams (squads of 3, or solo)
    const teamSize = GAME_CONFIG.TEAM_SIZE;
    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i];
      const teamId = Math.floor(i / teamSize).toString();

      // Initialize player
      const player: Player = {
        id: playerId,
        position: { x: 0, y: 0, z: 1000 }, // Start in dropship
        rotation: 0,
        health: GAME_CONFIG.MAX_HEALTH,
        maxHealth: GAME_CONFIG.MAX_HEALTH,
        shield: 0, // Start without shield
        maxShield: GAME_CONFIG.MAX_SHIELD,
        isAlive: true,
        isDown: false,
        reviveProgress: 0,
        consumables: [],
        kills: 0,
        damage: 0,
        placement: 0,
        survivalTime: 0,
        isMoving: false,
        isSprinting: false,
        isCrouching: false,
        isInVehicle: false,
        inputSequence: 0,
        lastInputTime: 0,
        ping: 50,
        inZone: true, // Start in safe zone
        zoneDamageAccumulator: 0
      };

      players.set(playerId, player);
      alivePlayers.add(playerId);

      // Create team
      if (!teams.has(teamId)) {
        teams.set(teamId, []);
      }
      teams.get(teamId)!.push(playerId);
    }

    // Initialize map
    const mapCenter = { x: 0, y: 0, z: 0 };
    const buildings = this.generateBuildings();

    return {
      matchId,
      gameMode: 'halo-royale',
      phase: 'lobby',
      startTime: Date.now(),
      gameTime: 0,
      players,
      teams,
      alivePlayers,
      spectators: new Set(),
      mapBounds: {
        center: mapCenter,
        radius: GAME_CONFIG.INITIAL_ZONE_RADIUS,
        shrinkDuration: 0
      },
      zoneDamage: 0,
      zonePhase: 0,
      nextZoneShrink: 0,
      lootItems: new Map(),
      vehicles: new Map(),
      buildings,
      projectiles: [],
      killFeed: [],
      winnerType: teams.size === 1 ? 'solo' : 'team',
      playersRemaining: alivePlayers.size,
      dropShip: {
        position: { x: -2500, y: 0, z: 1000 },
        direction: { x: 1, y: 0, z: 0 },
        speed: 200,
        playersOnBoard: new Set(playerIds)
      }
    };
  }

  // Public API
  public startMatch(): void {
    this.matchState.phase = 'drop_phase';
    this.matchState.startTime = Date.now();
    this.lastTickTime = Date.now();

    // Start game loop
    this.gameTimer = setInterval(() => {
      this.gameTick();
    }, this.tickInterval);

    // Start zone management
    this.initializeZoneProgression();

    // Spawn initial loot
    this.spawnWorldLoot();

    // Initialize vehicles
    this.spawnVehicles();

    this.logger.info(`HaloRoyale match started: ${this.matchState.matchId}`);

    this.emit('match_started', {
      matchId: this.matchState.matchId,
      gameMode: this.matchState.gameMode,
      playerCount: this.matchState.players.size,
      phase: this.matchState.phase
    });
  }

  public processPlayerInput(playerId: string, input: any): boolean {
    const player = this.matchState.players.get(playerId);
    if (!player || (!player.isAlive && !this.matchState.spectators.has(playerId))) {
      return false;
    }

    // Anti-cheat: sequence validation
    if (input.sequence <= player.inputSequence) {
      this.logger.warn(`Invalid input sequence from ${playerId}`);
      return false;
    }

    player.inputSequence = input.sequence;
    player.lastInputTime = Date.now();

    // Process input based on type
    switch (input.type) {
      case 'move':
        return this.processMovement(player, input);
      case 'jump':
        return this.processJump(player, input);
      case 'attack':
        return this.processAttack(player, input);
      case 'reload':
        return this.processReload(player, input);
      case 'interact':
        return this.processInteract(player, input);
      case 'consume':
        return this.processConsume(player, input);
      case 'vehicle':
        return this.processVehicleAction(player, input);
      case 'revive':
        return this.processRevive(player, input);
      case 'spectate':
        return this.processSpectate(player, input);
      default:
        return false;
    }
  }

  public getGameState(): any {
    return {
      matchId: this.matchState.matchId,
      phase: this.matchState.phase,
      gameTime: this.matchState.gameTime,
      playersRemaining: this.matchState.playersRemaining,
      zone: {
        center: this.matchState.mapBounds.center,
        radius: this.matchState.mapBounds.radius,
        nextCenter: this.matchState.mapBounds.nextCenter,
        nextRadius: this.matchState.mapBounds.nextRadius,
        shrinkStartTime: this.matchState.mapBounds.shrinkStartTime,
        damage: this.matchState.zoneDamage,
        phase: this.matchState.zonePhase
      },
      winner: this.matchState.winner,
      killFeed: this.matchState.killFeed.slice(-10), // Last 10 kills
    };
  }

  public getPlayerState(playerId: string): any {
    const player = this.matchState.players.get(playerId);
    if (!player) return null;

    return {
      id: player.id,
      position: player.position,
      health: player.health,
      shield: player.shield,
      isAlive: player.isAlive,
      isDown: player.isDown,
      equipment: {
        primary: player.primaryWeapon,
        secondary: player.secondaryWeapon,
        consumables: player.consumables,
        armor: player.armor,
        backpack: player.backpack
      },
      stats: {
        kills: player.kills,
        damage: player.damage,
        survivalTime: Date.now() - this.matchState.startTime
      },
      inZone: player.inZone
    };
  }

  // Core game loop
  private gameTick(): void {
    const now = Date.now();
    const deltaTime = now - this.lastTickTime;
    this.lastTickTime = now;

    PerformanceMonitor.markStart('royale_tick');

    // Update game time
    this.matchState.gameTime += deltaTime;

    // Update all systems based on phase
    switch (this.matchState.phase) {
      case 'drop_phase':
        this.updateDropPhase(deltaTime);
        break;
      case 'playing':
      case 'final_circle':
        this.updatePlaying(deltaTime);
        break;
      case 'ended':
        return; // Stop processing
    }

    // Always update these systems
    this.updateProjectiles(deltaTime);
    this.updateZoneDamage(deltaTime);
    this.updateLoot(deltaTime);
    this.updateVehicles(deltaTime);
    this.checkMatchEndConditions();

    PerformanceMonitor.markEnd('royale_tick');

    // Emit tick for synchronization
    this.emit('game_tick', {
      matchId: this.matchState.matchId,
      tick: Math.floor(this.matchState.gameTime / this.tickInterval),
      gameTime: this.matchState.gameTime,
      deltaTime,
      playersAlive: this.matchState.alivePlayers.size
    });
  }

  // Phase updates
  private updateDropPhase(deltaTime: number): void {
    if (!this.matchState.dropShip) return;

    const dropShip = this.matchState.dropShip;

    // Move dropship
    dropShip.position.x += dropShip.direction.x * dropShip.speed * deltaTime / 1000;
    dropShip.position.y += dropShip.direction.y * dropShip.speed * deltaTime / 1000;

    // Update players still on dropship
    for (const playerId of dropShip.playersOnBoard) {
      const player = this.matchState.players.get(playerId);
      if (player) {
        player.position = { ...dropShip.position };
      }
    }

    // Auto-drop remaining players when dropship reaches end
    if (dropShip.position.x > GAME_CONFIG.MAP_SIZE / 2) {
      for (const playerId of dropShip.playersOnBoard) {
        this.forcePlayerDrop(playerId);
      }
    }

    // Transition to playing phase when all players have dropped
    if (dropShip.playersOnBoard.size === 0) {
      this.matchState.phase = 'playing';
      this.matchState.dropShip = undefined;
      this.logger.info('All players dropped - transitioning to playing phase');
    }
  }

  private updatePlaying(deltaTime: number): void {
    // Update all players
    for (const player of this.matchState.players.values()) {
      this.updatePlayer(player, deltaTime);
    }

    // Process combat and interactions
    this.processCollisions();
    this.updateDownedPlayers(deltaTime);
  }

  // Player input processing
  private processMovement(player: Player, input: any): boolean {
    if (!player.isAlive || player.isDown) return false;

    const { direction, magnitude, sprint, crouch } = input;

    // Validate input
    if (!direction || magnitude < 0 || magnitude > 1) return false;

    // Calculate speed
    let speed = GAME_CONFIG.MOVEMENT_SPEED * magnitude;

    player.isSprinting = sprint && !crouch;
    player.isCrouching = crouch && !sprint;
    player.isMoving = magnitude > 0.1;

    if (player.isSprinting) {
      speed *= GAME_CONFIG.SPRINT_MULTIPLIER;
    } else if (player.isCrouching) {
      speed *= GAME_CONFIG.CROUCH_MULTIPLIER;
    }

    // Apply movement
    const deltaTime = Date.now() - player.lastInputTime;
    const movement = {
      x: direction.x * speed * deltaTime / 1000,
      y: direction.y * speed * deltaTime / 1000,
      z: 0
    };

    player.position = this.applyMovement(player.position, movement);
    player.rotation = Math.atan2(direction.y, direction.x);

    return true;
  }

  private processJump(player: Player, input: any): boolean {
    if (!player.isAlive || player.isDown) return false;

    // Check if dropping from dropship
    if (this.matchState.phase === 'drop_phase' && this.matchState.dropShip?.playersOnBoard.has(player.id)) {
      return this.dropPlayer(player, input.targetPosition);
    }

    return false;
  }

  private processAttack(player: Player, input: any): boolean {
    if (!player.isAlive || player.isDown || !player.primaryWeapon) return false;

    const weapon = player.primaryWeapon;
    const { target, position, weaponSlot } = input;

    // Use secondary weapon if specified
    if (weaponSlot === 'secondary' && player.secondaryWeapon) {
      return this.fireWeapon(player, player.secondaryWeapon, target, position);
    }

    return this.fireWeapon(player, weapon, target, position);
  }

  private processReload(player: Player, input: any): boolean {
    if (!player.isAlive || player.isDown) return false;

    const weapon = input.weaponSlot === 'secondary' ? player.secondaryWeapon : player.primaryWeapon;
    if (!weapon || weapon.currentAmmo >= weapon.magSize) return false;

    // Start reload
    weapon.reloadStartTime = Date.now();
    return true;
  }

  private processInteract(player: Player, input: any): boolean {
    if (!player.isAlive || player.isDown) return false;

    const { targetId, action } = input;

    switch (action) {
      case 'pickup_loot':
        return this.pickupLoot(player, targetId);
      case 'enter_vehicle':
        return this.enterVehicle(player, targetId, input.seat);
      case 'exit_vehicle':
        return this.exitVehicle(player);
      case 'open_door':
        return this.openDoor(player, targetId);
      default:
        return false;
    }
  }

  private processConsume(player: Player, input: any): boolean {
    if (!player.isAlive || player.isDown) return false;

    const { itemId } = input;
    const consumable = player.consumables.find(c => c.id === itemId);

    if (!consumable || consumable.quantity <= 0) return false;

    // Start consumption
    this.startConsumption(player, consumable);
    return true;
  }

  private processVehicleAction(player: Player, input: any): boolean {
    if (!player.isAlive || !player.isInVehicle) return false;

    const vehicle = this.matchState.vehicles.get(player.vehicleId!);
    if (!vehicle) return false;

    const { action, direction, magnitude } = input;

    switch (action) {
      case 'drive':
        return this.driveVehicle(vehicle, direction, magnitude);
      case 'horn':
        this.emit('vehicle_horn', { vehicleId: vehicle.id, playerId: player.id });
        return true;
      default:
        return false;
    }
  }

  private processRevive(player: Player, input: any): boolean {
    if (!player.isAlive || player.isDown) return false;

    const { targetPlayerId } = input;
    const target = this.matchState.players.get(targetPlayerId);

    if (!target || !target.isDown) return false;

    // Check if in same team
    const playerTeam = this.findPlayerTeam(player.id);
    const targetTeam = this.findPlayerTeam(targetPlayerId);

    if (playerTeam !== targetTeam) return false;

    // Check distance
    const distance = this.calculateDistance(player.position, target.position);
    if (distance > 50) return false; // 5m revive range

    // Start/continue revive
    target.reviveProgress += 1000 / GAME_CONFIG.REVIVE_TIME; // Progress per second

    if (target.reviveProgress >= 1.0) {
      this.revivePlayer(target, player);
    }

    return true;
  }

  private processSpectate(player: Player, input: any): boolean {
    if (player.isAlive) return false;

    // Add to spectators if not already
    this.matchState.spectators.add(player.id);

    // Change spectate target
    if (input.targetPlayerId) {
      const target = this.matchState.players.get(input.targetPlayerId);
      if (target && target.isAlive) {
        // Update spectate target - handled by frontend
        return true;
      }
    }

    return true;
  }

  // Combat system
  private fireWeapon(player: Player, weapon: Weapon, targetId?: string, targetPosition?: Vector3): boolean {
    // Check cooldown
    const fireInterval = 60000 / weapon.fireRate; // Convert RPM to milliseconds
    if (Date.now() - weapon.lastFired < fireInterval) return false;

    // Check ammo
    if (weapon.currentAmmo <= 0) {
      // Try auto-reload
      if (weapon.reserveAmmo > 0) {
        weapon.reloadStartTime = Date.now();
      }
      return false;
    }

    // Determine target position
    let finalTarget: Vector3;
    if (targetId) {
      const target = this.matchState.players.get(targetId);
      if (!target) return false;
      finalTarget = target.position;
    } else if (targetPosition) {
      finalTarget = targetPosition;
    } else {
      return false;
    }

    // Check range
    const distance = this.calculateDistance(player.position, finalTarget);
    if (distance > weapon.range) return false;

    // Create projectile
    const projectile = this.createProjectile(player, weapon, finalTarget);
    this.matchState.projectiles.push(projectile);

    // Update weapon state
    weapon.currentAmmo--;
    weapon.lastFired = Date.now();

    // Emit weapon fired event
    this.emit('weapon_fired', {
      playerId: player.id,
      weaponType: weapon.type,
      targetPosition: finalTarget,
      projectileId: projectile.id
    });

    return true;
  }

  private createProjectile(player: Player, weapon: Weapon, targetPosition: Vector3): Projectile {
    // Calculate velocity with accuracy spread
    const baseDirection = this.normalizeVector({
      x: targetPosition.x - player.position.x,
      y: targetPosition.y - player.position.y,
      z: targetPosition.z - player.position.z
    });

    // Apply accuracy (spread)
    const spread = (1 - weapon.accuracy) * 0.2; // Max 20% spread
    const spreadX = (Math.random() - 0.5) * spread;
    const spreadY = (Math.random() - 0.5) * spread;

    const velocity = {
      x: (baseDirection.x + spreadX) * 800, // 800 m/s projectile speed
      y: (baseDirection.y + spreadY) * 800,
      z: baseDirection.z * 800
    };

    return {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ownerId: player.id,
      weaponType: weapon.type,
      position: { ...player.position },
      velocity,
      damage: weapon.damage,
      range: weapon.range,
      traveledDistance: 0,
      createdAt: Date.now(),
      piercing: weapon.type === 'sniper_rifle',
      explosive: weapon.type === 'rocket_launcher',
      explosionRadius: weapon.type === 'rocket_launcher' ? 200 : undefined
    };
  }

  // Zone management
  private initializeZoneProgression(): void {
    // Schedule first zone shrink
    const firstZone = GAME_CONFIG.ZONE_CONFIGS[0];
    this.scheduleZoneShrink(firstZone, 60000); // 1 minute grace period
  }

  private scheduleZoneShrink(zoneConfig: ZoneConfig, delay: number): void {
    this.zoneTimer = setTimeout(() => {
      this.startZoneShrink(zoneConfig);
    }, delay);
  }

  private startZoneShrink(zoneConfig: ZoneConfig): void {
    this.matchState.zonePhase = zoneConfig.phase;
    this.matchState.zoneDamage = zoneConfig.damagePerSecond;

    // Calculate next zone center (random but strategic)
    const nextCenter = this.calculateNextZoneCenter(zoneConfig.finalRadius);

    this.matchState.mapBounds.nextCenter = nextCenter;
    this.matchState.mapBounds.nextRadius = zoneConfig.finalRadius;
    this.matchState.mapBounds.shrinkStartTime = Date.now();
    this.matchState.mapBounds.shrinkDuration = zoneConfig.shrinkDuration;

    this.logger.info(`Zone phase ${zoneConfig.phase} shrinking to radius ${zoneConfig.finalRadius}`);

    this.emit('zone_shrink_started', {
      phase: zoneConfig.phase,
      currentCenter: this.matchState.mapBounds.center,
      currentRadius: this.matchState.mapBounds.radius,
      nextCenter,
      nextRadius: zoneConfig.finalRadius,
      shrinkDuration: zoneConfig.shrinkDuration,
      damage: zoneConfig.damagePerSecond
    });

    // Schedule zone completion
    setTimeout(() => {
      this.completeZoneShrink(zoneConfig);
    }, zoneConfig.shrinkDuration);
  }

  private completeZoneShrink(zoneConfig: ZoneConfig): void {
    if (this.matchState.mapBounds.nextCenter) {
      this.matchState.mapBounds.center = this.matchState.mapBounds.nextCenter;
      this.matchState.mapBounds.radius = this.matchState.mapBounds.nextRadius!;
      delete this.matchState.mapBounds.nextCenter;
      delete this.matchState.mapBounds.nextRadius;
      delete this.matchState.mapBounds.shrinkStartTime;
    }

    this.emit('zone_shrink_completed', {
      phase: zoneConfig.phase,
      newCenter: this.matchState.mapBounds.center,
      newRadius: this.matchState.mapBounds.radius
    });

    // Schedule next zone if not final
    const nextZoneIndex = zoneConfig.phase;
    if (nextZoneIndex < GAME_CONFIG.ZONE_CONFIGS.length) {
      const nextZone = GAME_CONFIG.ZONE_CONFIGS[nextZoneIndex];
      this.scheduleZoneShrink(nextZone, nextZone.waitTime);

      // Transition to final circle phase
      if (nextZone.phase >= 6) {
        this.matchState.phase = 'final_circle';
      }
    }
  }

  private calculateNextZoneCenter(newRadius: number): Vector3 {
    const currentCenter = this.matchState.mapBounds.center;
    const currentRadius = this.matchState.mapBounds.radius;

    // Weight towards player density (simplified)
    const playerPositions = Array.from(this.matchState.alivePlayers)
      .map(id => this.matchState.players.get(id)!)
      .filter(p => p.isAlive)
      .map(p => p.position);

    if (playerPositions.length === 0) {
      return currentCenter;
    }

    // Calculate average player position
    const avgPosition = {
      x: playerPositions.reduce((sum, pos) => sum + pos.x, 0) / playerPositions.length,
      y: playerPositions.reduce((sum, pos) => sum + pos.y, 0) / playerPositions.length,
      z: 0
    };

    // Blend with current center and add some randomness
    const blendFactor = 0.7; // 70% towards players, 30% current center
    const randomOffset = {
      x: (Math.random() - 0.5) * newRadius * 0.3,
      y: (Math.random() - 0.5) * newRadius * 0.3,
      z: 0
    };

    const nextCenter = {
      x: currentCenter.x * (1 - blendFactor) + avgPosition.x * blendFactor + randomOffset.x,
      y: currentCenter.y * (1 - blendFactor) + avgPosition.y * blendFactor + randomOffset.y,
      z: 0
    };

    // Ensure next center allows the new radius to fit within current zone
    const maxOffset = currentRadius - newRadius;
    const offsetFromCurrent = this.calculateDistance(currentCenter, nextCenter);

    if (offsetFromCurrent > maxOffset) {
      const scale = maxOffset / offsetFromCurrent;
      nextCenter.x = currentCenter.x + (nextCenter.x - currentCenter.x) * scale;
      nextCenter.y = currentCenter.y + (nextCenter.y - currentCenter.y) * scale;
    }

    return nextCenter;
  }

  // Loot and equipment system
  private spawnWorldLoot(): void {
    // Spawn loot at all building loot spawns
    for (const building of this.matchState.buildings) {
      for (const spawn of building.lootSpawns) {
        const loot = this.generateLootItem(spawn);
        if (loot) {
          this.matchState.lootItems.set(loot.id, loot);
          spawn.currentLoot = loot;
          spawn.lastSpawned = Date.now();
        }
      }
    }

    // Spawn random world loot
    for (let i = 0; i < 200; i++) {
      const position = this.getRandomMapPosition();
      const loot = this.generateRandomLoot(position);
      if (loot) {
        this.matchState.lootItems.set(loot.id, loot);
      }
    }

    this.logger.info(`Spawned ${this.matchState.lootItems.size} loot items`);
  }

  private generateLootItem(spawn: LootSpawn): LootItem | null {
    const rarityWeights = {
      common: 0.6,
      rare: 0.25,
      epic: 0.12,
      legendary: 0.03
    };

    // Determine actual rarity (can be higher than spawn rarity)
    const roll = Math.random();
    let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
    let cumulativeWeight = 0;

    for (const [r, weight] of Object.entries(rarityWeights)) {
      cumulativeWeight += weight;
      if (roll <= cumulativeWeight) {
        rarity = r as any;
        break;
      }
    }

    // Generate item based on spawn category
    let item: any;
    switch (spawn.category) {
      case 'weapon':
        item = this.generateWeapon(rarity);
        break;
      case 'armor':
        item = this.generateArmor(rarity);
        break;
      case 'consumable':
        item = this.generateConsumable(rarity);
        break;
      case 'attachment':
        item = this.generateAttachment(rarity);
        break;
      default:
        return null;
    }

    if (!item) return null;

    return {
      id: `loot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: spawn.position,
      item,
      spawnTime: Date.now(),
      despawnTime: Date.now() + GAME_CONFIG.LOOT_DESPAWN_TIME,
      highlighted: rarity !== 'common'
    };
  }

  private generateWeapon(rarity: string): Weapon {
    const weaponKeys = Object.keys(WEAPON_ROSTER);
    const weaponKey = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
    const weaponTemplate = WEAPON_ROSTER[weaponKey as keyof typeof WEAPON_ROSTER];

    // Calculate stats based on rarity
    const rarityMultipliers = {
      common: 1.0,
      rare: 1.1,
      epic: 1.2,
      legendary: 1.35
    };

    const multiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1.0;

    return {
      id: `${weaponKey}_${Date.now()}`,
      name: weaponTemplate.name,
      type: weaponTemplate.type,
      rarity: rarity as any,
      damage: Math.floor(weaponTemplate.damage * multiplier),
      fireRate: weaponTemplate.fireRate,
      range: Math.floor(weaponTemplate.range * multiplier),
      accuracy: Math.min(0.99, weaponTemplate.accuracy * multiplier),
      reloadTime: Math.max(1000, weaponTemplate.reloadTime / multiplier),
      magSize: weaponTemplate.magSize,
      currentAmmo: weaponTemplate.magSize,
      reserveAmmo: weaponTemplate.magSize * 3,
      attachments: [],
      lastFired: 0
    };
  }

  private generateArmor(rarity: string): Armor {
    const types: Armor['type'][] = ['helmet', 'chest', 'legs'];
    const type = types[Math.floor(Math.random() * types.length)];

    const baseProtection = { helmet: 25, chest: 40, legs: 20 }[type];
    const baseDurability = { helmet: 100, chest: 150, legs: 100 }[type];

    const rarityMultipliers = {
      common: 1.0,
      rare: 1.25,
      epic: 1.5,
      legendary: 2.0
    };

    const multiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1.0;

    return {
      id: `armor_${type}_${Date.now()}`,
      name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${type}`,
      type,
      rarity: rarity as any,
      protection: Math.floor(baseProtection * multiplier),
      durability: Math.floor(baseDurability * multiplier),
      maxDurability: Math.floor(baseDurability * multiplier)
    };
  }

  private generateConsumable(rarity: string): Consumable {
    const consumableTypes = [
      { type: 'health_kit', name: 'Health Kit', useTime: 5000, effect: { health: 100 } },
      { type: 'shield_cell', name: 'Shield Cell', useTime: 3000, effect: { shield: 50 } },
      { type: 'energy_drink', name: 'Energy Drink', useTime: 2000, effect: { speed: 1.2, duration: 30000 } }
    ];

    const template = consumableTypes[Math.floor(Math.random() * consumableTypes.length)];

    return {
      id: `${template.type}_${Date.now()}`,
      name: template.name,
      type: template.type as any,
      rarity: rarity as any,
      quantity: rarity === 'common' ? 2 : rarity === 'rare' ? 3 : 5,
      useTime: template.useTime,
      effect: template.effect
    };
  }

  private generateAttachment(rarity: string): WeaponAttachment {
    const attachmentTypes = [
      { type: 'scope', effects: { accuracy: 0.1, range: 50 } },
      { type: 'barrel', effects: { damage: 5, accuracy: 0.05 } },
      { type: 'grip', effects: { accuracy: 0.15 } },
      { type: 'magazine', effects: { magSize: 8, reloadTime: -500 } }
    ];

    const template = attachmentTypes[Math.floor(Math.random() * attachmentTypes.length)];

    const rarityMultipliers = {
      common: 1.0,
      rare: 1.5,
      epic: 2.0,
      legendary: 3.0
    };

    const multiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] || 1.0;
    const scaledEffects: any = {};

    for (const [key, value] of Object.entries(template.effects)) {
      scaledEffects[key] = typeof value === 'number' ? value * multiplier : value;
    }

    return {
      id: `${template.type}_${rarity}_${Date.now()}`,
      type: template.type as any,
      name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${template.type}`,
      effects: scaledEffects
    };
  }

  private generateRandomLoot(position: Vector3): LootItem | null {
    // 60% weapon, 20% armor, 15% consumable, 5% attachment
    const roll = Math.random();
    let category: LootSpawn['category'];

    if (roll < 0.6) category = 'weapon';
    else if (roll < 0.8) category = 'armor';
    else if (roll < 0.95) category = 'consumable';
    else category = 'attachment';

    const spawn: LootSpawn = {
      id: 'random',
      position,
      rarity: 'common',
      category,
      cooldown: 0,
      lastSpawned: 0
    };

    return this.generateLootItem(spawn);
  }

  // Utility methods
  private updatePlayer(player: Player, deltaTime: number): void {
    // Update survival time
    player.survivalTime += deltaTime;

    // Handle shield regeneration
    if (player.shield < player.maxShield && Date.now() - player.lastInputTime > 10000) {
      player.shield = Math.min(player.maxShield, player.shield + deltaTime / 100);
    }

    // Handle weapon reloading
    if (player.primaryWeapon?.reloadStartTime) {
      const elapsed = Date.now() - player.primaryWeapon.reloadStartTime;
      if (elapsed >= player.primaryWeapon.reloadTime) {
        this.completeReload(player.primaryWeapon);
        delete player.primaryWeapon.reloadStartTime;
      }
    }

    if (player.secondaryWeapon?.reloadStartTime) {
      const elapsed = Date.now() - player.secondaryWeapon.reloadStartTime;
      if (elapsed >= player.secondaryWeapon.reloadTime) {
        this.completeReload(player.secondaryWeapon);
        delete player.secondaryWeapon.reloadStartTime;
      }
    }

    // Update zone status
    this.updatePlayerZoneStatus(player);
  }

  private updatePlayerZoneStatus(player: Player): void {
    let currentRadius = this.matchState.mapBounds.radius;
    let currentCenter = this.matchState.mapBounds.center;

    // Check if zone is shrinking
    if (this.matchState.mapBounds.shrinkStartTime && this.matchState.mapBounds.nextCenter) {
      const elapsed = Date.now() - this.matchState.mapBounds.shrinkStartTime;
      const progress = Math.min(1, elapsed / this.matchState.mapBounds.shrinkDuration);

      // Interpolate current zone during shrink
      currentRadius = this.matchState.mapBounds.radius +
        (this.matchState.mapBounds.nextRadius! - this.matchState.mapBounds.radius) * progress;

      currentCenter = {
        x: this.matchState.mapBounds.center.x +
           (this.matchState.mapBounds.nextCenter.x - this.matchState.mapBounds.center.x) * progress,
        y: this.matchState.mapBounds.center.y +
           (this.matchState.mapBounds.nextCenter.y - this.matchState.mapBounds.center.y) * progress,
        z: 0
      };
    }

    const distanceFromCenter = this.calculateDistance(player.position, currentCenter);
    const wasInZone = player.inZone;
    player.inZone = distanceFromCenter <= currentRadius;

    // Track zone entry/exit
    if (wasInZone && !player.inZone) {
      player.zoneEntryTime = Date.now();
    } else if (!wasInZone && player.inZone) {
      delete player.zoneEntryTime;
      player.zoneDamageAccumulator = 0;
    }
  }

  private updateZoneDamage(deltaTime: number): void {
    if (this.matchState.zoneDamage === 0) return;

    for (const player of this.matchState.players.values()) {
      if (!player.isAlive || player.inZone) continue;

      // Apply zone damage
      player.zoneDamageAccumulator += this.matchState.zoneDamage * deltaTime / 1000;

      // Apply accumulated damage every second
      if (player.zoneDamageAccumulator >= 1.0) {
        const damage = Math.floor(player.zoneDamageAccumulator);
        player.zoneDamageAccumulator -= damage;

        this.applyDamage(player, damage, null, 'zone');

        this.emit('zone_damage', {
          playerId: player.id,
          damage,
          remainingHealth: player.health
        });
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.matchState.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.matchState.projectiles[i];

      // Update position
      projectile.position.x += projectile.velocity.x * deltaTime / 1000;
      projectile.position.y += projectile.velocity.y * deltaTime / 1000;
      projectile.position.z += projectile.velocity.z * deltaTime / 1000;

      // Update distance traveled
      const frameDistance = Math.sqrt(
        Math.pow(projectile.velocity.x * deltaTime / 1000, 2) +
        Math.pow(projectile.velocity.y * deltaTime / 1000, 2) +
        Math.pow(projectile.velocity.z * deltaTime / 1000, 2)
      );
      projectile.traveledDistance += frameDistance;

      // Remove if out of range or bounds
      if (projectile.traveledDistance > projectile.range || !this.isInMapBounds(projectile.position)) {
        this.matchState.projectiles.splice(i, 1);
        continue;
      }

      // Check for hits
      if (this.checkProjectileHit(projectile)) {
        this.matchState.projectiles.splice(i, 1);
      }
    }
  }

  private updateDownedPlayers(deltaTime: number): void {
    for (const player of this.matchState.players.values()) {
      if (!player.isDown) continue;

      // Check for bleed out
      if (player.downTime && Date.now() - player.downTime > GAME_CONFIG.BLEED_OUT_TIME) {
        this.eliminatePlayer(player, null, 'bleed_out');
        continue;
      }

      // Reset revive progress if no one is reviving
      const teammatesNearby = this.getTeammatesInRange(player, 50);
      if (teammatesNearby.length === 0) {
        player.reviveProgress = Math.max(0, player.reviveProgress - deltaTime / 1000);
      }
    }
  }

  private updateLoot(deltaTime: number): void {
    const now = Date.now();

    // Remove expired loot
    for (const [lootId, loot] of this.matchState.lootItems) {
      if (loot.despawnTime && now > loot.despawnTime) {
        this.matchState.lootItems.delete(lootId);
      }
    }

    // Respawn building loot
    for (const building of this.matchState.buildings) {
      if (building.isDestroyed) continue;

      for (const spawn of building.lootSpawns) {
        if (!spawn.currentLoot &&
            now - spawn.lastSpawned > GAME_CONFIG.BUILDING_LOOT_COOLDOWN) {
          const newLoot = this.generateLootItem(spawn);
          if (newLoot) {
            this.matchState.lootItems.set(newLoot.id, newLoot);
            spawn.currentLoot = newLoot;
            spawn.lastSpawned = now;
          }
        }
      }
    }
  }

  private updateVehicles(deltaTime: number): void {
    const now = Date.now();

    for (const vehicle of this.matchState.vehicles.values()) {
      // Vehicle decay when unused
      if (vehicle.occupants.size === 0 &&
          now - vehicle.lastUsed > GAME_CONFIG.VEHICLE_DECAY_TIME) {
        vehicle.health = Math.max(0, vehicle.health - deltaTime / 100);
      }

      // Fuel consumption when driving
      if (vehicle.occupants.has('driver') && vehicle.fuel > 0) {
        vehicle.fuel = Math.max(0, vehicle.fuel - GAME_CONFIG.FUEL_CONSUMPTION_RATE * deltaTime / 1000);
      }
    }
  }

  private processCollisions(): void {
    // Process all projectile hits
    for (let i = this.matchState.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.matchState.projectiles[i];
      if (this.checkProjectileHit(projectile)) {
        this.matchState.projectiles.splice(i, 1);
      }
    }
  }

  private checkProjectileHit(projectile: Projectile): boolean {
    const owner = this.matchState.players.get(projectile.ownerId);
    if (!owner) return true; // Remove orphaned projectiles

    // Check hits against all other players
    for (const player of this.matchState.players.values()) {
      if (player.id === projectile.ownerId || !player.isAlive) continue;

      const distance = this.calculateDistance(projectile.position, player.position);
      const hitRadius = 30; // Hit detection radius

      if (distance <= hitRadius) {
        // Calculate damage with distance falloff and headshot detection
        let damage = projectile.damage;
        let isHeadshot = false;

        // Simple headshot detection (height difference)
        if (projectile.position.z > player.position.z + 50) {
          damage *= GAME_CONFIG.HEADSHOT_MULTIPLIER;
          isHeadshot = true;
        }

        // Apply damage
        const killed = this.applyDamage(player, damage, owner, projectile.weaponType);
        const hitDistance = this.calculateDistance(owner.position, player.position);

        // Record hit
        this.emit('player_hit', {
          shooterId: owner.id,
          victimId: player.id,
          weapon: projectile.weaponType,
          damage,
          isHeadshot,
          distance: hitDistance
        });

        // Handle elimination/knockdown
        if (killed) {
          this.handlePlayerKilled(player, owner, projectile.weaponType, isHeadshot, hitDistance);
        }

        // Projectile consumed unless piercing
        return !projectile.piercing;
      }
    }

    // Check vehicle hits
    for (const vehicle of this.matchState.vehicles.values()) {
      const distance = this.calculateDistance(projectile.position, vehicle.position);
      if (distance <= 100) { // Vehicle hit radius
        vehicle.health = Math.max(0, vehicle.health - projectile.damage * 0.5);

        if (vehicle.health === 0) {
          this.destroyVehicle(vehicle, owner);
        }

        return true; // Projectile consumed
      }
    }

    // Check explosive projectiles
    if (projectile.explosive) {
      return this.handleExplosiveProjectile(projectile, owner);
    }

    return false;
  }

  // Combat and elimination
  private applyDamage(target: Player, damage: number, attacker: Player | null, source: string): boolean {
    // Apply armor reduction
    let finalDamage = damage;

    if (target.armor && source !== 'zone') {
      const reduction = target.armor.protection / 100;
      finalDamage *= (1 - reduction);

      // Damage armor durability
      target.armor.durability = Math.max(0, target.armor.durability - damage * 0.1);

      if (target.armor.durability === 0) {
        target.armor = undefined; // Armor destroyed
      }
    }

    // Apply to shield first, then health
    if (target.shield > 0) {
      const shieldDamage = Math.min(target.shield, finalDamage);
      target.shield -= shieldDamage;
      finalDamage -= shieldDamage;
    }

    if (finalDamage > 0) {
      target.health -= finalDamage;
    }

    // Update attacker stats
    if (attacker) {
      attacker.damage += damage;
    }

    // Check for knockdown/elimination
    if (target.health <= 0) {
      const teammates = this.getTeammatesAlive(target);

      if (teammates.length > 0 && !target.isDown) {
        // Knock down instead of eliminate
        this.knockdownPlayer(target);
        return false;
      } else {
        // Full elimination
        this.eliminatePlayer(target, attacker, source);
        return true;
      }
    }

    return false;
  }

  private knockdownPlayer(player: Player): void {
    player.isDown = true;
    player.health = GAME_CONFIG.DOWN_HEALTH;
    player.downTime = Date.now();
    player.reviveProgress = 0;

    this.emit('player_knocked_down', {
      playerId: player.id,
      position: player.position,
      downTime: player.downTime
    });

    this.logger.info(`Player ${player.id} knocked down`);
  }

  private eliminatePlayer(player: Player, killer: Player | null, source: string): void {
    player.isAlive = false;
    player.isDown = false;
    this.matchState.alivePlayers.delete(player.id);
    this.matchState.playersRemaining--;
    player.placement = this.matchState.playersRemaining + 1;

    // Update killer stats
    if (killer && killer.id !== player.id) {
      killer.kills++;
    }

    // Add to kill feed
    this.matchState.killFeed.push({
      killerId: killer?.id,
      victimId: player.id,
      weapon: source,
      isHeadshot: false, // Determined at projectile level
      isKnockdown: false,
      distance: killer ? this.calculateDistance(killer.position, player.position) : 0,
      timestamp: Date.now()
    });

    this.emit('player_eliminated', {
      playerId: player.id,
      killerId: killer?.id,
      source,
      placement: player.placement,
      survivalTime: player.survivalTime
    });

    this.logger.info(`Player ${player.id} eliminated by ${killer?.id || source} (Placement: ${player.placement})`);

    // Check if entire team is eliminated
    const teammates = this.getTeammatesAlive(player);
    if (teammates.length === 0) {
      this.eliminateTeam(this.findPlayerTeam(player.id)!);
    }
  }

  private eliminateTeam(teamId: string): void {
    const teamMembers = this.matchState.teams.get(teamId) || [];

    for (const playerId of teamMembers) {
      const player = this.matchState.players.get(playerId);
      if (player && player.isAlive) {
        this.eliminatePlayer(player, null, 'team_elimination');
      }
    }

    this.emit('team_eliminated', {
      teamId,
      members: teamMembers,
      placement: Math.ceil(this.matchState.playersRemaining / GAME_CONFIG.TEAM_SIZE) + 1
    });
  }

  private revivePlayer(target: Player, reviver: Player): void {
    target.isDown = false;
    target.health = 50; // Revive with half health
    target.reviveProgress = 0;
    delete target.downTime;
    target.revivedBy = reviver.id;

    this.emit('player_revived', {
      targetId: target.id,
      reviverId: reviver.id,
      position: target.position
    });

    this.logger.info(`Player ${target.id} revived by ${reviver.id}`);
  }

  private handlePlayerKilled(victim: Player, killer: Player, weapon: string, isHeadshot: boolean, distance: number): void {
    // Add to kill feed
    this.matchState.killFeed.push({
      killerId: killer.id,
      victimId: victim.id,
      weapon,
      isHeadshot,
      isKnockdown: victim.isDown,
      distance,
      timestamp: Date.now()
    });

    // Limit kill feed size
    if (this.matchState.killFeed.length > 20) {
      this.matchState.killFeed.shift();
    }
  }

  // Match state management
  private checkMatchEndConditions(): void {
    // Check for winner
    if (this.matchState.alivePlayers.size <= 1) {
      const winner = this.matchState.alivePlayers.size === 1 ?
        Array.from(this.matchState.alivePlayers)[0] : null;

      this.endMatch(winner);
      return;
    }

    // Check for time limit
    if (this.matchState.gameTime > GAME_CONFIG.MATCH_MAX_DURATION) {
      this.endMatch(null);
    }
  }

  private endMatch(winnerId: string | null): void {
    this.matchState.phase = 'ended';
    this.matchState.winner = winnerId;

    // Stop all timers
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    if (this.zoneTimer) {
      clearTimeout(this.zoneTimer);
      this.zoneTimer = null;
    }

    // Calculate final placements and stats
    const finalStats = this.calculateFinalStats();

    this.emit('match_ended', {
      matchId: this.matchState.matchId,
      winner: winnerId,
      winnerType: this.matchState.winnerType,
      duration: this.matchState.gameTime,
      playersRemaining: this.matchState.playersRemaining,
      stats: finalStats
    });

    this.logger.info(`HaloRoyale match ended - Winner: ${winnerId || 'None'}`);
  }

  // Helper methods
  private dropPlayer(player: Player, targetPosition?: Vector3): boolean {
    if (!this.matchState.dropShip?.playersOnBoard.has(player.id)) return false;

    // Remove from dropship
    this.matchState.dropShip.playersOnBoard.delete(player.id);

    // Set drop position
    if (targetPosition) {
      player.position = { ...targetPosition, z: 1000 }; // High altitude
    } else {
      player.position = { ...this.matchState.dropShip.position };
    }

    // Start parachute descent
    this.startParachuteDescent(player);

    this.emit('player_dropped', {
      playerId: player.id,
      position: player.position,
      targetPosition
    });

    return true;
  }

  private forcePlayerDrop(playerId: string): void {
    const player = this.matchState.players.get(playerId);
    if (player) {
      this.dropPlayer(player);
    }
  }

  private startParachuteDescent(player: Player): void {
    // Simplified parachute - just land after 10 seconds
    setTimeout(() => {
      // Find safe landing position
      player.position.z = 0;
      player.position = this.findSafeLandingPosition(player.position);

      this.emit('player_landed', {
        playerId: player.id,
        position: player.position
      });
    }, 10000);
  }

  private findSafeLandingPosition(preferredPosition: Vector3): Vector3 {
    // Simple implementation - ensure within map bounds
    return {
      x: Math.max(-GAME_CONFIG.MAP_SIZE/2, Math.min(GAME_CONFIG.MAP_SIZE/2, preferredPosition.x)),
      y: Math.max(-GAME_CONFIG.MAP_SIZE/2, Math.min(GAME_CONFIG.MAP_SIZE/2, preferredPosition.y)),
      z: 0
    };
  }

  private pickupLoot(player: Player, lootId: string): boolean {
    const loot = this.matchState.lootItems.get(lootId);
    if (!loot) return false;

    // Check distance
    const distance = this.calculateDistance(player.position, loot.position);
    if (distance > 100) return false; // 10m pickup range

    // Try to add item to player inventory
    const success = this.addItemToPlayer(player, loot.item);

    if (success) {
      // Remove loot from world
      this.matchState.lootItems.delete(lootId);

      // Clear from loot spawn if applicable
      for (const building of this.matchState.buildings) {
        for (const spawn of building.lootSpawns) {
          if (spawn.currentLoot?.id === lootId) {
            spawn.currentLoot = undefined;
          }
        }
      }

      this.emit('loot_picked_up', {
        playerId: player.id,
        lootId,
        item: loot.item
      });

      return true;
    }

    return false;
  }

  private addItemToPlayer(player: Player, item: any): boolean {
    if ('type' in item) {
      switch (item.type) {
        case 'assault_rifle':
        case 'sniper_rifle':
        case 'shotgun':
        case 'pistol':
        case 'rocket_launcher':
          // Weapon
          if (!player.primaryWeapon) {
            player.primaryWeapon = item;
          } else if (!player.secondaryWeapon) {
            player.secondaryWeapon = item;
          } else {
            // Drop current primary, equip new weapon
            this.dropItem(player, player.primaryWeapon);
            player.primaryWeapon = item;
          }
          return true;

        case 'helmet':
        case 'chest':
        case 'legs':
          // Armor
          const currentArmor = player.armor;
          if (!currentArmor || item.protection > currentArmor.protection) {
            if (currentArmor) {
              this.dropItem(player, currentArmor);
            }
            player.armor = item;
            return true;
          }
          return false;

        case 'health_kit':
        case 'shield_cell':
        case 'energy_drink':
        case 'grenade':
          // Consumable
          const existing = player.consumables.find(c => c.id === item.id);
          if (existing && existing.quantity < 10) {
            existing.quantity += item.quantity;
            return true;
          } else if (player.consumables.length < 6) {
            player.consumables.push(item);
            return true;
          }
          return false;

        case 'backpack':
        case 'utility':
          // Equipment
          if (item.type === 'backpack') {
            if (!player.backpack || item.capacity! > (player.backpack as any).capacity) {
              if (player.backpack) {
                this.dropItem(player, player.backpack);
              }
              player.backpack = item;
              return true;
            }
          }
          return false;

        default:
          return false;
      }
    }

    return false;
  }

  private dropItem(player: Player, item: any): void {
    // Create loot item at player position
    const loot: LootItem = {
      id: `dropped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { ...player.position },
      item,
      spawnTime: Date.now(),
      despawnTime: Date.now() + GAME_CONFIG.LOOT_DESPAWN_TIME,
      highlighted: false
    };

    this.matchState.lootItems.set(loot.id, loot);

    this.emit('item_dropped', {
      playerId: player.id,
      lootId: loot.id,
      item
    });
  }

  private completeReload(weapon: Weapon): void {
    const ammoNeeded = weapon.magSize - weapon.currentAmmo;
    const ammoToReload = Math.min(ammoNeeded, weapon.reserveAmmo);

    weapon.currentAmmo += ammoToReload;
    weapon.reserveAmmo -= ammoToReload;
  }

  private startConsumption(player: Player, consumable: Consumable): void {
    // Simple consumption - apply effect immediately for now
    // In a full implementation, this would be a timed channel

    if (consumable.effect.health) {
      player.health = Math.min(player.maxHealth, player.health + consumable.effect.health);
    }

    if (consumable.effect.shield) {
      player.shield = Math.min(player.maxShield, player.shield + consumable.effect.shield);
    }

    // Consume item
    consumable.quantity--;
    if (consumable.quantity <= 0) {
      const index = player.consumables.indexOf(consumable);
      player.consumables.splice(index, 1);
    }

    this.emit('consumable_used', {
      playerId: player.id,
      consumableId: consumable.id,
      effect: consumable.effect
    });
  }

  // Vehicle system
  private spawnVehicles(): void {
    const vehicleSpawns = [
      { type: 'mongoose', count: 20, positions: this.generateVehicleSpawnPositions(20) },
      { type: 'warthog', count: 10, positions: this.generateVehicleSpawnPositions(10) },
      { type: 'scorpion', count: 3, positions: this.generateVehicleSpawnPositions(3) }
    ];

    for (const spawn of vehicleSpawns) {
      for (let i = 0; i < spawn.count; i++) {
        const vehicle = this.createVehicle(spawn.type as any, spawn.positions[i]);
        this.matchState.vehicles.set(vehicle.id, vehicle);
      }
    }

    this.logger.info(`Spawned ${this.matchState.vehicles.size} vehicles`);
  }

  private createVehicle(type: Vehicle['type'], position: Vector3): Vehicle {
    const vehicleStats = {
      mongoose: { health: 200, maxHealth: 200, speed: 400, maxOccupants: 2, maxFuel: 100 },
      warthog: { health: 500, maxHealth: 500, speed: 300, maxOccupants: 3, maxFuel: 150 },
      scorpion: { health: 1000, maxHealth: 1000, speed: 150, maxOccupants: 1, maxFuel: 80 }
    };

    const stats = vehicleStats[type];

    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      rotation: Math.random() * Math.PI * 2,
      health: stats.health,
      maxHealth: stats.maxHealth,
      speed: stats.speed,
      occupants: new Map(),
      maxOccupants: stats.maxOccupants,
      fuel: stats.maxFuel,
      maxFuel: stats.maxFuel,
      lastUsed: Date.now()
    };
  }

  private generateVehicleSpawnPositions(count: number): Vector3[] {
    const positions: Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions.push({
        x: (Math.random() - 0.5) * GAME_CONFIG.MAP_SIZE * 0.8,
        y: (Math.random() - 0.5) * GAME_CONFIG.MAP_SIZE * 0.8,
        z: 0
      });
    }

    return positions;
  }

  private enterVehicle(player: Player, vehicleId: string, seat: 'driver' | 'passenger' | 'gunner'): boolean {
    const vehicle = this.matchState.vehicles.get(vehicleId);
    if (!vehicle || vehicle.occupants.size >= vehicle.maxOccupants) return false;

    // Check distance
    const distance = this.calculateDistance(player.position, vehicle.position);
    if (distance > 100) return false;

    // Check if seat is available
    if (vehicle.occupants.has(seat)) return false;

    // Enter vehicle
    vehicle.occupants.set(seat, player.id);
    player.isInVehicle = true;
    player.vehicleId = vehicleId;
    vehicle.lastUsed = Date.now();

    this.emit('player_entered_vehicle', {
      playerId: player.id,
      vehicleId,
      seat
    });

    return true;
  }

  private exitVehicle(player: Player): boolean {
    if (!player.isInVehicle || !player.vehicleId) return false;

    const vehicle = this.matchState.vehicles.get(player.vehicleId);
    if (!vehicle) return false;

    // Find player's seat
    let playerSeat: string | null = null;
    for (const [seat, occupantId] of vehicle.occupants) {
      if (occupantId === player.id) {
        playerSeat = seat;
        break;
      }
    }

    if (!playerSeat) return false;

    // Exit vehicle
    vehicle.occupants.delete(playerSeat);
    player.isInVehicle = false;
    delete player.vehicleId;

    // Set player position near vehicle
    player.position = {
      x: vehicle.position.x + (Math.random() - 0.5) * 100,
      y: vehicle.position.y + (Math.random() - 0.5) * 100,
      z: 0
    };

    this.emit('player_exited_vehicle', {
      playerId: player.id,
      vehicleId: vehicle.id,
      seat: playerSeat
    });

    return true;
  }

  private driveVehicle(vehicle: Vehicle, direction: Vector3, magnitude: number): boolean {
    if (!vehicle.occupants.has('driver') || vehicle.fuel <= 0) return false;

    // Move vehicle
    const speed = vehicle.speed * magnitude;
    const deltaTime = this.tickInterval;

    vehicle.position.x += direction.x * speed * deltaTime / 1000;
    vehicle.position.y += direction.y * speed * deltaTime / 1000;
    vehicle.rotation = Math.atan2(direction.y, direction.x);

    // Consume fuel
    vehicle.fuel -= GAME_CONFIG.FUEL_CONSUMPTION_RATE * deltaTime / 1000;

    // Update all occupants' positions
    for (const occupantId of vehicle.occupants.values()) {
      const occupant = this.matchState.players.get(occupantId);
      if (occupant) {
        occupant.position = { ...vehicle.position };
      }
    }

    return true;
  }

  private destroyVehicle(vehicle: Vehicle, destroyer?: Player): void {
    // Damage all occupants
    for (const occupantId of vehicle.occupants.values()) {
      const occupant = this.matchState.players.get(occupantId);
      if (occupant) {
        this.applyDamage(occupant, 50, destroyer, 'vehicle_explosion');
        this.exitVehicle(occupant);
      }
    }

    // Remove vehicle
    this.matchState.vehicles.delete(vehicle.id);

    this.emit('vehicle_destroyed', {
      vehicleId: vehicle.id,
      destroyerId: destroyer?.id,
      position: vehicle.position
    });
  }

  // Map and building generation
  private generateBuildings(): Building[] {
    const buildings: Building[] = [];
    const buildingTypes: Building['type'][] = ['house', 'warehouse', 'tower', 'bunker'];

    // Generate 50 random buildings across the map
    for (let i = 0; i < 50; i++) {
      const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
      const position = this.getRandomMapPosition();

      const building = this.createBuilding(type, position);
      buildings.push(building);
    }

    return buildings;
  }

  private createBuilding(type: Building['type'], position: Vector3): Building {
    const buildingSizes = {
      house: { width: 100, depth: 100, height: 60, lootSpawns: 3 },
      warehouse: { width: 200, depth: 150, height: 40, lootSpawns: 8 },
      tower: { width: 60, depth: 60, height: 200, lootSpawns: 6 },
      bunker: { width: 150, depth: 100, height: 30, lootSpawns: 5 }
    };

    const size = buildingSizes[type];
    const bounds = {
      minX: position.x - size.width / 2,
      maxX: position.x + size.width / 2,
      minY: position.y - size.depth / 2,
      maxY: position.y + size.depth / 2,
      minZ: position.z,
      maxZ: position.z + size.height
    };

    // Generate loot spawns within building
    const lootSpawns: LootSpawn[] = [];
    for (let i = 0; i < size.lootSpawns; i++) {
      lootSpawns.push({
        id: `${type}_loot_${i}`,
        position: {
          x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
          y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
          z: bounds.minZ
        },
        rarity: 'common',
        category: ['weapon', 'armor', 'consumable'][Math.floor(Math.random() * 3)] as any,
        cooldown: GAME_CONFIG.BUILDING_LOOT_COOLDOWN,
        lastSpawned: 0
      });
    }

    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      bounds,
      lootSpawns,
      isDestroyed: false
    };
  }

  private getRandomMapPosition(): Vector3 {
    return {
      x: (Math.random() - 0.5) * GAME_CONFIG.MAP_SIZE,
      y: (Math.random() - 0.5) * GAME_CONFIG.MAP_SIZE,
      z: 0
    };
  }

  // Explosion handling
  private handleExplosiveProjectile(projectile: Projectile, owner: Player): boolean {
    const explosionRadius = projectile.explosionRadius || 200;

    // Find all players in explosion radius
    for (const player of this.matchState.players.values()) {
      if (!player.isAlive) continue;

      const distance = this.calculateDistance(projectile.position, player.position);
      if (distance <= explosionRadius) {
        // Calculate falloff damage
        const falloffFactor = Math.max(0.2, 1 - (distance / explosionRadius));
        const damage = projectile.damage * falloffFactor;

        this.applyDamage(player, damage, owner, 'explosion');
      }
    }

    // Damage vehicles
    for (const vehicle of this.matchState.vehicles.values()) {
      const distance = this.calculateDistance(projectile.position, vehicle.position);
      if (distance <= explosionRadius * 1.5) {
        vehicle.health = Math.max(0, vehicle.health - projectile.damage);
        if (vehicle.health === 0) {
          this.destroyVehicle(vehicle, owner);
        }
      }
    }

    this.emit('explosion', {
      position: projectile.position,
      radius: explosionRadius,
      damage: projectile.damage,
      causerId: owner.id
    });

    return true;
  }

  // Utility methods
  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private normalizeVector(vector: Vector3): Vector3 {
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (magnitude === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude,
      z: vector.z / magnitude
    };
  }

  private applyMovement(position: Vector3, movement: Vector3): Vector3 {
    const newPos = {
      x: position.x + movement.x,
      y: position.y + movement.y,
      z: position.z + movement.z
    };

    // Keep within map bounds
    newPos.x = Math.max(-GAME_CONFIG.MAP_SIZE/2, Math.min(GAME_CONFIG.MAP_SIZE/2, newPos.x));
    newPos.y = Math.max(-GAME_CONFIG.MAP_SIZE/2, Math.min(GAME_CONFIG.MAP_SIZE/2, newPos.y));
    newPos.z = Math.max(0, newPos.z);

    return newPos;
  }

  private isInMapBounds(position: Vector3): boolean {
    return position.x >= -GAME_CONFIG.MAP_SIZE/2 &&
           position.x <= GAME_CONFIG.MAP_SIZE/2 &&
           position.y >= -GAME_CONFIG.MAP_SIZE/2 &&
           position.y <= GAME_CONFIG.MAP_SIZE/2;
  }

  private findPlayerTeam(playerId: string): string | null {
    for (const [teamId, members] of this.matchState.teams) {
      if (members.includes(playerId)) {
        return teamId;
      }
    }
    return null;
  }

  private getTeammatesAlive(player: Player): Player[] {
    const teamId = this.findPlayerTeam(player.id);
    if (!teamId) return [];

    const teamMembers = this.matchState.teams.get(teamId) || [];
    return teamMembers
      .filter(id => id !== player.id)
      .map(id => this.matchState.players.get(id)!)
      .filter(p => p.isAlive && !p.isDown);
  }

  private getTeammatesInRange(player: Player, range: number): Player[] {
    const teammates = this.getTeammatesAlive(player);
    return teammates.filter(teammate => {
      const distance = this.calculateDistance(player.position, teammate.position);
      return distance <= range;
    });
  }

  private openDoor(player: Player, doorId: string): boolean {
    // Simplified door system - would integrate with building system
    this.emit('door_opened', {
      playerId: player.id,
      doorId
    });
    return true;
  }

  private calculateFinalStats(): any {
    const playerStats = Array.from(this.matchState.players.values()).map(player => ({
      playerId: player.id,
      placement: player.placement,
      kills: player.kills,
      damage: player.damage,
      survivalTime: player.survivalTime,
      teamId: this.findPlayerTeam(player.id)
    }));

    return {
      players: playerStats,
      totalKills: playerStats.reduce((sum, p) => sum + p.kills, 0),
      averageSurvivalTime: playerStats.reduce((sum, p) => sum + p.survivalTime, 0) / playerStats.length,
      matchDuration: this.matchState.gameTime,
      zonePhases: this.matchState.zonePhase,
      winner: this.matchState.winner
    };
  }

  public cleanup(): void {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }

    if (this.zoneTimer) {
      clearTimeout(this.zoneTimer);
      this.zoneTimer = null;
    }

    this.removeAllListeners();
    this.logger.info(`HaloRoyale match cleaned up: ${this.matchState.matchId}`);
  }
}