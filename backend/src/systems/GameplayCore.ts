// HaloBuzz Core Gameplay Systems
// Shared systems for combat, movement, economy, and progression across all game modes

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performanceMonitor';

// Common types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

// Player state interfaces
export interface BasePlayer {
  id: string;
  position: Vector3;
  velocity: Vector3;
  rotation: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  level: number;
  experience: number;
  isAlive: boolean;
  lastDamageTime: number;
  buffs: Buff[];
  debuffs: Debuff[];
}

export interface Buff {
  id: string;
  type: 'damage' | 'speed' | 'health_regen' | 'shield_regen' | 'resistance';
  value: number;
  duration: number;
  startTime: number;
  source: string;
  stackable: boolean;
  maxStacks?: number;
  currentStacks?: number;
}

export interface Debuff {
  id: string;
  type: 'slow' | 'poison' | 'weakness' | 'silence' | 'stun';
  value: number;
  duration: number;
  startTime: number;
  source: string;
  tickInterval?: number; // For damage over time effects
  lastTick?: number;
}

// Combat system
export interface DamageEvent {
  source: string;
  target: string;
  damage: number;
  damageType: 'physical' | 'energy' | 'explosive' | 'environmental';
  isHeadshot: boolean;
  isCritical: boolean;
  distance: number;
  weaponUsed?: string;
  abilityUsed?: string;
  timestamp: number;
}

export interface HealEvent {
  source: string;
  target: string;
  amount: number;
  healType: 'direct' | 'over_time' | 'shield' | 'combined';
  timestamp: number;
}

// Movement system
export interface MovementState {
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  groundNormal: Vector3;
  isGrounded: boolean;
  isSliding: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  isClimbing: boolean;
  climbSurface?: Vector3;
  lastGroundTime: number;
  airTime: number;
}

export interface MovementInput {
  direction: Vector2;
  magnitude: number;
  jump: boolean;
  crouch: boolean;
  sprint: boolean;
  climb: boolean;
  slide: boolean;
}

// Weapon and ability system
export interface Weapon {
  id: string;
  name: string;
  type: 'assault_rifle' | 'sniper_rifle' | 'shotgun' | 'pistol' | 'rocket_launcher' | 'energy' | 'melee';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'exotic';
  damage: DamageProfile;
  fireRate: number; // rounds per minute
  range: number;
  accuracy: AccuracyProfile;
  recoil: RecoilProfile;
  reload: ReloadProfile;
  ammo: AmmoProfile;
  attachmentSlots: AttachmentSlot[];
  attachments: WeaponAttachment[];
  upgrades: WeaponUpgrade[];
}

export interface DamageProfile {
  base: number;
  headshot: number;
  bodyshot: number;
  limbshot: number;
  falloffStart: number; // Distance where damage starts to fall off
  falloffEnd: number; // Distance where minimum damage is reached
  minDamage: number; // Minimum damage at max range
}

export interface AccuracyProfile {
  baseSpread: number;
  movingSpread: number;
  jumpingSpread: number;
  crouchingAccuracyBonus: number;
  aimDownSightBonus: number;
  consecutiveShotPenalty: number;
  recoveryRate: number; // How fast accuracy recovers
}

export interface RecoilProfile {
  verticalRecoil: number;
  horizontalRecoil: number;
  recoilPattern: Vector2[]; // Predefined recoil pattern
  recoveryRate: number;
  firstShotMultiplier: number;
}

export interface ReloadProfile {
  reloadTime: number;
  tacticalReloadTime: number; // Reload with rounds still in chamber
  reloadInterruptible: boolean;
  reloadCancellable: boolean;
}

export interface AmmoProfile {
  magSize: number;
  reserveAmmo: number;
  ammoType: 'kinetic' | 'energy' | 'explosive' | 'special';
  infiniteAmmo: boolean;
}

export interface AttachmentSlot {
  type: 'optic' | 'barrel' | 'grip' | 'magazine' | 'stock';
  required: boolean;
}

export interface WeaponAttachment {
  id: string;
  name: string;
  type: AttachmentSlot['type'];
  rarity: Weapon['rarity'];
  effects: Partial<Weapon>;
  unlockLevel?: number;
}

export interface WeaponUpgrade {
  id: string;
  name: string;
  description: string;
  cost: CurrencyCost;
  effects: Partial<Weapon>;
  requiresAttachment?: string;
}

// Economy system
export interface CurrencyCost {
  credits?: number;
  premiumCredits?: number;
  materials?: Array<{ id: string; quantity: number }>;
  experience?: number;
}

export interface Economy {
  credits: number;
  premiumCredits: number;
  materials: Map<string, number>;
  inventory: InventoryItem[];
  dailyRewards: DailyReward[];
  achievementProgress: Map<string, number>;
}

export interface InventoryItem {
  id: string;
  type: 'weapon' | 'attachment' | 'cosmetic' | 'consumable' | 'material';
  quantity: number;
  acquiredAt: number;
  expiresAt?: number;
  tradeable: boolean;
  sellable: boolean;
  value: CurrencyCost;
}

export interface DailyReward {
  id: string;
  day: number;
  reward: InventoryItem;
  claimed: boolean;
  claimedAt?: number;
}

// Progression system
export interface PlayerProgression {
  playerLevel: number;
  playerExperience: number;
  experienceToNext: number;
  battlePassLevel: number;
  battlePassExperience: number;
  seasonLevel: number;
  weaponProgression: Map<string, WeaponProgression>;
  achievements: Map<string, AchievementProgress>;
  statistics: PlayerStatistics;
}

export interface WeaponProgression {
  weaponId: string;
  level: number;
  experience: number;
  kills: number;
  headshotKills: number;
  unlockedAttachments: string[];
  unlockedUpgrades: string[];
  masteryProgress: number;
}

export interface AchievementProgress {
  achievementId: string;
  progress: number;
  completed: boolean;
  completedAt?: number;
  claimedReward: boolean;
}

export interface PlayerStatistics {
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalDamage: number;
  totalHealing: number;
  matchesPlayed: number;
  matchesWon: number;
  bestKillStreak: number;
  totalPlayTime: number;
  favoriteWeapon: string;
  accuracyRating: number;
  survivalRating: number;
  teamplayRating: number;
}

// Core systems
export class CombatSystem extends EventEmitter {
  private logger = new Logger('CombatSystem');
  private damageEvents: DamageEvent[] = [];
  private healEvents: HealEvent[] = [];

  // Damage calculation
  public calculateDamage(
    weapon: Weapon,
    distance: number,
    hitLocation: 'head' | 'body' | 'limb',
    isCritical: boolean = false
  ): number {
    const { damage } = weapon;
    let baseDamage = damage.base;

    // Apply hit location multiplier
    switch (hitLocation) {
      case 'head':
        baseDamage *= damage.headshot;
        break;
      case 'body':
        baseDamage *= damage.bodyshot;
        break;
      case 'limb':
        baseDamage *= damage.limbshot;
        break;
    }

    // Apply distance falloff
    if (distance > damage.falloffStart) {
      const falloffRange = damage.falloffEnd - damage.falloffStart;
      const falloffDistance = Math.min(distance - damage.falloffStart, falloffRange);
      const falloffFactor = 1 - (falloffDistance / falloffRange);
      const falloffDamage = damage.minDamage + (baseDamage - damage.minDamage) * falloffFactor;
      baseDamage = Math.max(damage.minDamage, falloffDamage);
    }

    // Apply critical hit multiplier
    if (isCritical) {
      baseDamage *= 1.5;
    }

    return Math.round(baseDamage);
  }

  // Apply damage to a player with all modifiers
  public applyDamage(
    target: BasePlayer,
    damage: number,
    damageType: DamageEvent['damageType'],
    source: string,
    isHeadshot: boolean = false,
    isCritical: boolean = false,
    weaponUsed?: string
  ): { damageDealt: number; killed: boolean } {
    // Calculate damage reduction from buffs
    let finalDamage = damage;

    for (const buff of target.buffs) {
      if (buff.type === 'resistance') {
        finalDamage *= (1 - buff.value / 100);
      }
    }

    // Apply damage to shields first, then health
    let shieldDamage = 0;
    let healthDamage = 0;

    if (target.shield > 0) {
      shieldDamage = Math.min(target.shield, finalDamage);
      target.shield -= shieldDamage;
      finalDamage -= shieldDamage;
    }

    if (finalDamage > 0) {
      healthDamage = Math.min(target.health, finalDamage);
      target.health -= healthDamage;
      target.lastDamageTime = Date.now();
    }

    const totalDamageDealt = shieldDamage + healthDamage;
    const killed = target.health <= 0;

    // Create damage event
    const damageEvent: DamageEvent = {
      source,
      target: target.id,
      damage: totalDamageDealt,
      damageType,
      isHeadshot,
      isCritical,
      distance: 0, // Would be calculated by caller
      weaponUsed,
      timestamp: Date.now()
    };

    this.damageEvents.push(damageEvent);
    this.emit('damage_dealt', damageEvent);

    if (killed) {
      target.isAlive = false;
      this.emit('player_killed', {
        victimId: target.id,
        killerId: source,
        weapon: weaponUsed,
        isHeadshot,
        timestamp: Date.now()
      });
    }

    return { damageDealt: totalDamageDealt, killed };
  }

  // Healing system
  public applyHealing(
    target: BasePlayer,
    amount: number,
    healType: HealEvent['healType'],
    source: string
  ): number {
    let healingApplied = 0;

    switch (healType) {
      case 'direct':
        healingApplied = Math.min(amount, target.maxHealth - target.health);
        target.health += healingApplied;
        break;

      case 'shield':
        healingApplied = Math.min(amount, target.maxShield - target.shield);
        target.shield += healingApplied;
        break;

      case 'combined':
        const healthHealing = Math.min(amount * 0.6, target.maxHealth - target.health);
        const shieldHealing = Math.min(amount * 0.4, target.maxShield - target.shield);
        target.health += healthHealing;
        target.shield += shieldHealing;
        healingApplied = healthHealing + shieldHealing;
        break;

      case 'over_time':
        // Would be handled by buff system
        break;
    }

    // Create heal event
    const healEvent: HealEvent = {
      source,
      target: target.id,
      amount: healingApplied,
      healType,
      timestamp: Date.now()
    };

    this.healEvents.push(healEvent);
    this.emit('healing_applied', healEvent);

    return healingApplied;
  }

  // Buff and debuff system
  public applyBuff(target: BasePlayer, buff: Buff): boolean {
    // Check if buff is stackable
    if (buff.stackable) {
      const existingBuff = target.buffs.find(b => b.id === buff.id);
      if (existingBuff) {
        if (existingBuff.currentStacks! < (existingBuff.maxStacks || 5)) {
          existingBuff.currentStacks = (existingBuff.currentStacks || 1) + 1;
          existingBuff.value += buff.value;
          existingBuff.duration = Math.max(existingBuff.duration, buff.duration);
          return true;
        }
        return false;
      }
    }

    // Add new buff
    buff.startTime = Date.now();
    buff.currentStacks = 1;
    target.buffs.push(buff);

    this.emit('buff_applied', {
      targetId: target.id,
      buff,
      timestamp: Date.now()
    });

    return true;
  }

  public applyDebuff(target: BasePlayer, debuff: Debuff): boolean {
    debuff.startTime = Date.now();
    debuff.lastTick = Date.now();
    target.debuffs.push(debuff);

    this.emit('debuff_applied', {
      targetId: target.id,
      debuff,
      timestamp: Date.now()
    });

    return true;
  }

  // Update buff/debuff timers and effects
  public updateEffects(target: BasePlayer, deltaTime: number): void {
    const now = Date.now();

    // Update buffs
    for (let i = target.buffs.length - 1; i >= 0; i--) {
      const buff = target.buffs[i];
      if (now - buff.startTime >= buff.duration) {
        target.buffs.splice(i, 1);
        this.emit('buff_expired', {
          targetId: target.id,
          buffId: buff.id,
          timestamp: now
        });
      }
    }

    // Update debuffs
    for (let i = target.debuffs.length - 1; i >= 0; i--) {
      const debuff = target.debuffs[i];

      // Handle damage over time effects
      if (debuff.tickInterval && (!debuff.lastTick || now - debuff.lastTick >= debuff.tickInterval)) {
        this.applyDamage(target, debuff.value, 'environmental', debuff.source);
        debuff.lastTick = now;
      }

      // Remove expired debuffs
      if (now - debuff.startTime >= debuff.duration) {
        target.debuffs.splice(i, 1);
        this.emit('debuff_expired', {
          targetId: target.id,
          debuffId: debuff.id,
          timestamp: now
        });
      }
    }
  }

  public getRecentDamageEvents(timeWindow: number = 10000): DamageEvent[] {
    const cutoff = Date.now() - timeWindow;
    return this.damageEvents.filter(event => event.timestamp > cutoff);
  }

  public getRecentHealEvents(timeWindow: number = 10000): HealEvent[] {
    const cutoff = Date.now() - timeWindow;
    return this.healEvents.filter(event => event.timestamp > cutoff);
  }
}

export class MovementSystem extends EventEmitter {
  private logger = new Logger('MovementSystem');

  // Movement constants
  private readonly GRAVITY = -980; // m/s²
  private readonly TERMINAL_VELOCITY = -500; // m/s
  private readonly GROUND_FRICTION = 0.8;
  private readonly AIR_FRICTION = 0.98;
  private readonly JUMP_VELOCITY = 400; // m/s
  private readonly CLIMB_SPEED = 200; // m/s
  private readonly SLIDE_ACCELERATION = 600; // m/s²
  private readonly SLIDE_FRICTION = 0.95;

  // Process movement input and update player state
  public updateMovement(
    player: BasePlayer & { movementState: MovementState },
    input: MovementInput,
    deltaTime: number,
    gameWorld: any // Collision detection context
  ): void {
    PerformanceMonitor.markStart('movement_update');

    const { movementState } = player;
    const dt = deltaTime / 1000; // Convert to seconds

    // Calculate desired movement
    const desiredVelocity = this.calculateDesiredVelocity(player, input);

    // Apply movement forces
    this.applyMovementForces(movementState, desiredVelocity, input, dt);

    // Apply physics
    this.applyPhysics(movementState, dt);

    // Handle special movement states
    this.handleSpecialMovement(player, input, dt);

    // Collision detection and resolution
    this.resolveCollisions(player, gameWorld, dt);

    // Update player position
    player.position.x += movementState.velocity.x * dt;
    player.position.y += movementState.velocity.y * dt;
    player.position.z += movementState.velocity.z * dt;

    // Update movement state
    this.updateMovementState(movementState, dt);

    PerformanceMonitor.markEnd('movement_update');
  }

  private calculateDesiredVelocity(
    player: BasePlayer & { movementState: MovementState },
    input: MovementInput
  ): Vector3 {
    if (input.magnitude < 0.1) {
      return { x: 0, y: 0, z: 0 };
    }

    // Base movement speed
    let speed = 300; // Base speed in units per second

    // Apply speed modifiers
    for (const buff of player.buffs) {
      if (buff.type === 'speed') {
        speed *= (1 + buff.value / 100);
      }
    }

    for (const debuff of player.debuffs) {
      if (debuff.type === 'slow') {
        speed *= (1 - debuff.value / 100);
      }
    }

    // Movement state modifiers
    if (input.sprint && !input.crouch) {
      speed *= 1.5;
    } else if (input.crouch) {
      speed *= 0.6;
    }

    // Sliding speed
    if (player.movementState.isSliding) {
      speed *= 1.2;
    }

    // Convert 2D input to 3D velocity
    const forward = {
      x: Math.cos(player.rotation),
      y: Math.sin(player.rotation),
      z: 0
    };

    const right = {
      x: -Math.sin(player.rotation),
      y: Math.cos(player.rotation),
      z: 0
    };

    return {
      x: (forward.x * input.direction.y + right.x * input.direction.x) * speed * input.magnitude,
      y: (forward.y * input.direction.y + right.y * input.direction.x) * speed * input.magnitude,
      z: 0
    };
  }

  private applyMovementForces(
    movementState: MovementState,
    desiredVelocity: Vector3,
    input: MovementInput,
    deltaTime: number
  ): void {
    // Horizontal movement
    if (movementState.isGrounded) {
      // Ground movement with friction
      const acceleration = 1000; // Ground acceleration
      const velocityDiff = {
        x: desiredVelocity.x - movementState.velocity.x,
        y: desiredVelocity.y - movementState.velocity.y
      };

      movementState.velocity.x += velocityDiff.x * acceleration * deltaTime;
      movementState.velocity.y += velocityDiff.y * acceleration * deltaTime;

      // Apply ground friction
      movementState.velocity.x *= this.GROUND_FRICTION;
      movementState.velocity.y *= this.GROUND_FRICTION;
    } else {
      // Air movement with reduced control
      const airAcceleration = 300;
      const velocityDiff = {
        x: desiredVelocity.x - movementState.velocity.x,
        y: desiredVelocity.y - movementState.velocity.y
      };

      movementState.velocity.x += velocityDiff.x * airAcceleration * deltaTime;
      movementState.velocity.y += velocityDiff.y * airAcceleration * deltaTime;

      // Apply air friction
      movementState.velocity.x *= this.AIR_FRICTION;
      movementState.velocity.y *= this.AIR_FRICTION;
    }

    // Jumping
    if (input.jump && movementState.isGrounded && !input.crouch) {
      movementState.velocity.z = this.JUMP_VELOCITY;
      movementState.isGrounded = false;
      movementState.lastGroundTime = Date.now();

      this.emit('player_jumped', {
        position: { ...movementState.position },
        velocity: { ...movementState.velocity }
      });
    }
  }

  private applyPhysics(movementState: MovementState, deltaTime: number): void {
    // Apply gravity
    if (!movementState.isGrounded && !movementState.isClimbing) {
      movementState.velocity.z += this.GRAVITY * deltaTime;
      movementState.velocity.z = Math.max(this.TERMINAL_VELOCITY, movementState.velocity.z);
      movementState.airTime += deltaTime * 1000;
    }

    // Climbing physics
    if (movementState.isClimbing) {
      movementState.velocity.z = Math.max(-50, movementState.velocity.z); // Reduce fall speed while climbing
    }
  }

  private handleSpecialMovement(
    player: BasePlayer & { movementState: MovementState },
    input: MovementInput,
    deltaTime: number
  ): void {
    const { movementState } = player;

    // Sliding mechanics
    if (input.slide && movementState.isGrounded && !movementState.isSliding) {
      if (Math.sqrt(movementState.velocity.x ** 2 + movementState.velocity.y ** 2) > 200) {
        movementState.isSliding = true;
        movementState.isCrouching = false;

        // Boost initial slide velocity
        const slideDirection = this.normalizeVector2({
          x: movementState.velocity.x,
          y: movementState.velocity.y
        });

        movementState.velocity.x = slideDirection.x * 500;
        movementState.velocity.y = slideDirection.y * 500;

        this.emit('slide_started', {
          playerId: player.id,
          position: { ...player.position },
          direction: slideDirection
        });
      }
    }

    // Maintain slide
    if (movementState.isSliding) {
      // Apply slide friction
      movementState.velocity.x *= this.SLIDE_FRICTION;
      movementState.velocity.y *= this.SLIDE_FRICTION;

      // End slide if too slow
      const slideSpeed = Math.sqrt(movementState.velocity.x ** 2 + movementState.velocity.y ** 2);
      if (slideSpeed < 150 || !input.slide) {
        movementState.isSliding = false;
        this.emit('slide_ended', {
          playerId: player.id,
          position: { ...player.position }
        });
      }
    }

    // Crouching
    if (input.crouch && !movementState.isSliding) {
      movementState.isCrouching = true;
    } else if (!input.crouch) {
      movementState.isCrouching = false;
    }

    // Sprinting
    movementState.isSprinting = input.sprint && !input.crouch && !movementState.isSliding;

    // Climbing detection and mechanics
    if (input.climb && this.canClimb(movementState)) {
      movementState.isClimbing = true;
      movementState.velocity.z = this.CLIMB_SPEED;
    } else if (movementState.isClimbing && (!input.climb || !this.canClimb(movementState))) {
      movementState.isClimbing = false;
      delete movementState.climbSurface;
    }
  }

  private resolveCollisions(
    player: BasePlayer & { movementState: MovementState },
    gameWorld: any,
    deltaTime: number
  ): void {
    // Simplified collision resolution
    // In a full implementation, this would use proper collision detection

    // Ground check
    const groundCheckDistance = 10;
    const groundPosition = {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z - groundCheckDistance
    };

    // Simulate ground detection
    const isGroundDetected = player.position.z <= 0; // Simplified ground at z=0

    if (isGroundDetected && player.movementState.velocity.z <= 0) {
      player.movementState.isGrounded = true;
      player.movementState.velocity.z = 0;
      player.position.z = Math.max(0, player.position.z);
      player.movementState.airTime = 0;

      // Landing event
      if (Date.now() - player.movementState.lastGroundTime > 500) {
        this.emit('player_landed', {
          playerId: player.id,
          position: { ...player.position },
          airTime: player.movementState.airTime
        });
      }
    } else {
      player.movementState.isGrounded = false;
    }

    // Wall collision (simplified)
    const mapBounds = 2000; // Map boundary
    if (Math.abs(player.position.x) > mapBounds) {
      player.position.x = Math.sign(player.position.x) * mapBounds;
      player.movementState.velocity.x = 0;
    }

    if (Math.abs(player.position.y) > mapBounds) {
      player.position.y = Math.sign(player.position.y) * mapBounds;
      player.movementState.velocity.y = 0;
    }
  }

  private updateMovementState(movementState: MovementState, deltaTime: number): void {
    // Update movement state flags and timers
    const speed = Math.sqrt(
      movementState.velocity.x ** 2 +
      movementState.velocity.y ** 2
    );

    // Update position history for interpolation
    movementState.position = {
      x: movementState.position.x + movementState.velocity.x * deltaTime,
      y: movementState.position.y + movementState.velocity.y * deltaTime,
      z: movementState.position.z + movementState.velocity.z * deltaTime
    };
  }

  private canClimb(movementState: MovementState): boolean {
    // Simplified climb detection
    // Would check for climbable surfaces in a full implementation
    return false;
  }

  private normalizeVector2(vector: Vector2): Vector2 {
    const magnitude = Math.sqrt(vector.x ** 2 + vector.y ** 2);
    if (magnitude === 0) return { x: 0, y: 0 };

    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude
    };
  }
}

export class EconomySystem extends EventEmitter {
  private logger = new Logger('EconomySystem');

  // Currency operations
  public addCredits(player: Economy, amount: number, source: string): boolean {
    player.credits += amount;

    this.emit('credits_earned', {
      amount,
      newTotal: player.credits,
      source,
      timestamp: Date.now()
    });

    this.logger.info(`Added ${amount} credits from ${source}, new total: ${player.credits}`);
    return true;
  }

  public spendCredits(player: Economy, amount: number, purpose: string): boolean {
    if (player.credits < amount) {
      return false;
    }

    player.credits -= amount;

    this.emit('credits_spent', {
      amount,
      newTotal: player.credits,
      purpose,
      timestamp: Date.now()
    });

    this.logger.info(`Spent ${amount} credits on ${purpose}, remaining: ${player.credits}`);
    return true;
  }

  public addPremiumCredits(player: Economy, amount: number, source: string): boolean {
    player.premiumCredits += amount;

    this.emit('premium_credits_earned', {
      amount,
      newTotal: player.premiumCredits,
      source,
      timestamp: Date.now()
    });

    return true;
  }

  // Material management
  public addMaterial(player: Economy, materialId: string, quantity: number): boolean {
    const currentAmount = player.materials.get(materialId) || 0;
    player.materials.set(materialId, currentAmount + quantity);

    this.emit('material_earned', {
      materialId,
      quantity,
      newTotal: currentAmount + quantity,
      timestamp: Date.now()
    });

    return true;
  }

  public spendMaterials(player: Economy, costs: Array<{ id: string; quantity: number }>): boolean {
    // Check if player has enough materials
    for (const cost of costs) {
      const available = player.materials.get(cost.id) || 0;
      if (available < cost.quantity) {
        return false;
      }
    }

    // Deduct materials
    for (const cost of costs) {
      const current = player.materials.get(cost.id)!;
      player.materials.set(cost.id, current - cost.quantity);
    }

    this.emit('materials_spent', {
      costs,
      timestamp: Date.now()
    });

    return true;
  }

  // Inventory management
  public addItemToInventory(player: Economy, item: InventoryItem): boolean {
    // Check for existing stackable items
    if (item.type === 'material' || item.type === 'consumable') {
      const existing = player.inventory.find(i =>
        i.id === item.id && i.type === item.type
      );

      if (existing) {
        existing.quantity += item.quantity;
        this.emit('inventory_updated', {
          itemId: item.id,
          newQuantity: existing.quantity,
          action: 'stacked',
          timestamp: Date.now()
        });
        return true;
      }
    }

    // Add new item
    player.inventory.push(item);

    this.emit('inventory_updated', {
      itemId: item.id,
      action: 'added',
      timestamp: Date.now()
    });

    return true;
  }

  public removeItemFromInventory(player: Economy, itemId: string, quantity: number = 1): boolean {
    const itemIndex = player.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return false;

    const item = player.inventory[itemIndex];

    if (item.quantity <= quantity) {
      // Remove entire item
      player.inventory.splice(itemIndex, 1);
      this.emit('inventory_updated', {
        itemId,
        action: 'removed',
        timestamp: Date.now()
      });
    } else {
      // Reduce quantity
      item.quantity -= quantity;
      this.emit('inventory_updated', {
        itemId,
        newQuantity: item.quantity,
        action: 'consumed',
        timestamp: Date.now()
      });
    }

    return true;
  }

  // Shop and purchasing
  public purchaseItem(player: Economy, item: InventoryItem, cost: CurrencyCost): boolean {
    // Check if player can afford the item
    if (!this.canAfford(player, cost)) {
      return false;
    }

    // Deduct costs
    this.deductCosts(player, cost);

    // Add item to inventory
    this.addItemToInventory(player, item);

    this.emit('item_purchased', {
      itemId: item.id,
      cost,
      timestamp: Date.now()
    });

    return true;
  }

  public sellItem(player: Economy, itemId: string, quantity: number = 1): boolean {
    const item = player.inventory.find(i => i.id === itemId);
    if (!item || !item.sellable || item.quantity < quantity) {
      return false;
    }

    // Calculate sell value (usually 50% of purchase price)
    const sellValue = this.calculateSellValue(item, quantity);

    // Remove item
    this.removeItemFromInventory(player, itemId, quantity);

    // Add credits
    this.addCredits(player, sellValue.credits || 0, 'item_sale');

    this.emit('item_sold', {
      itemId,
      quantity,
      value: sellValue,
      timestamp: Date.now()
    });

    return true;
  }

  // Daily rewards
  public claimDailyReward(player: Economy, day: number): boolean {
    const reward = player.dailyRewards.find(r => r.day === day && !r.claimed);
    if (!reward) return false;

    reward.claimed = true;
    reward.claimedAt = Date.now();

    // Add reward to inventory
    this.addItemToInventory(player, reward.reward);

    this.emit('daily_reward_claimed', {
      day,
      reward: reward.reward,
      timestamp: Date.now()
    });

    return true;
  }

  // Market and trading
  public createTradeOffer(
    fromPlayer: Economy,
    toPlayer: Economy,
    offeredItems: string[],
    requestedItems: string[]
  ): string {
    // Create trade offer
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.emit('trade_offer_created', {
      tradeId,
      fromPlayer,
      toPlayer,
      offeredItems,
      requestedItems,
      timestamp: Date.now()
    });

    return tradeId;
  }

  // Utility methods
  private canAfford(player: Economy, cost: CurrencyCost): boolean {
    if (cost.credits && player.credits < cost.credits) return false;
    if (cost.premiumCredits && player.premiumCredits < cost.premiumCredits) return false;

    if (cost.materials) {
      for (const material of cost.materials) {
        const available = player.materials.get(material.id) || 0;
        if (available < material.quantity) return false;
      }
    }

    return true;
  }

  private deductCosts(player: Economy, cost: CurrencyCost): void {
    if (cost.credits) {
      player.credits -= cost.credits;
    }

    if (cost.premiumCredits) {
      player.premiumCredits -= cost.premiumCredits;
    }

    if (cost.materials) {
      for (const material of cost.materials) {
        const current = player.materials.get(material.id) || 0;
        player.materials.set(material.id, current - material.quantity);
      }
    }
  }

  private calculateSellValue(item: InventoryItem, quantity: number): CurrencyCost {
    // Calculate 50% of original value
    const sellValue: CurrencyCost = {};

    if (item.value.credits) {
      sellValue.credits = Math.floor((item.value.credits * quantity) * 0.5);
    }

    if (item.value.materials) {
      sellValue.materials = item.value.materials.map(m => ({
        id: m.id,
        quantity: Math.floor((m.quantity * quantity) * 0.5)
      }));
    }

    return sellValue;
  }
}

export class ProgressionSystem extends EventEmitter {
  private logger = new Logger('ProgressionSystem');

  // Experience and leveling
  public addExperience(
    progression: PlayerProgression,
    amount: number,
    source: string
  ): { leveledUp: boolean; newLevel?: number } {
    progression.playerExperience += amount;

    // Check for level up
    let leveledUp = false;
    let newLevel = progression.playerLevel;

    while (progression.playerExperience >= progression.experienceToNext) {
      progression.playerExperience -= progression.experienceToNext;
      progression.playerLevel++;
      newLevel = progression.playerLevel;
      leveledUp = true;

      // Calculate next level requirement
      progression.experienceToNext = this.calculateExperienceRequired(progression.playerLevel + 1);

      this.emit('level_up', {
        newLevel: progression.playerLevel,
        source,
        timestamp: Date.now()
      });
    }

    this.emit('experience_gained', {
      amount,
      source,
      newTotal: progression.playerExperience,
      progress: progression.playerExperience / progression.experienceToNext,
      timestamp: Date.now()
    });

    return { leveledUp, newLevel: leveledUp ? newLevel : undefined };
  }

  // Weapon progression
  public addWeaponExperience(
    progression: PlayerProgression,
    weaponId: string,
    experience: number,
    kills: number = 0,
    headshots: number = 0
  ): boolean {
    let weaponProg = progression.weaponProgression.get(weaponId);

    if (!weaponProg) {
      weaponProg = {
        weaponId,
        level: 1,
        experience: 0,
        kills: 0,
        headshotKills: 0,
        unlockedAttachments: [],
        unlockedUpgrades: [],
        masteryProgress: 0
      };
      progression.weaponProgression.set(weaponId, weaponProg);
    }

    // Add experience and stats
    weaponProg.experience += experience;
    weaponProg.kills += kills;
    weaponProg.headshotKills += headshots;

    // Check for weapon level up
    const expRequired = this.calculateWeaponExperienceRequired(weaponProg.level + 1);
    if (weaponProg.experience >= expRequired) {
      weaponProg.level++;
      weaponProg.experience -= expRequired;

      // Check for unlocks
      const newUnlocks = this.checkWeaponUnlocks(weaponId, weaponProg.level);
      weaponProg.unlockedAttachments.push(...newUnlocks.attachments);
      weaponProg.unlockedUpgrades.push(...newUnlocks.upgrades);

      this.emit('weapon_level_up', {
        weaponId,
        newLevel: weaponProg.level,
        newUnlocks,
        timestamp: Date.now()
      });
    }

    // Update mastery progress
    this.updateWeaponMastery(weaponProg);

    return true;
  }

  // Achievement system
  public updateAchievementProgress(
    progression: PlayerProgression,
    achievementId: string,
    progress: number
  ): boolean {
    let achProgress = progression.achievements.get(achievementId);

    if (!achProgress) {
      achProgress = {
        achievementId,
        progress: 0,
        completed: false,
        claimedReward: false
      };
      progression.achievements.set(achievementId, achProgress);
    }

    if (achProgress.completed) return false;

    // Update progress
    achProgress.progress = Math.min(100, achProgress.progress + progress);

    // Check completion
    if (achProgress.progress >= 100 && !achProgress.completed) {
      achProgress.completed = true;
      achProgress.completedAt = Date.now();

      this.emit('achievement_completed', {
        achievementId,
        timestamp: Date.now()
      });

      return true;
    }

    this.emit('achievement_progress', {
      achievementId,
      newProgress: achProgress.progress,
      timestamp: Date.now()
    });

    return false;
  }

  // Statistics tracking
  public updateStatistics(
    progression: PlayerProgression,
    stats: Partial<PlayerStatistics>
  ): void {
    const current = progression.statistics;

    // Update provided stats
    Object.assign(current, stats);

    // Calculate derived statistics
    current.accuracyRating = this.calculateAccuracyRating(current);
    current.survivalRating = this.calculateSurvivalRating(current);
    current.teamplayRating = this.calculateTeamplayRating(current);

    this.emit('statistics_updated', {
      updatedStats: stats,
      timestamp: Date.now()
    });
  }

  // Battle pass progression
  public addBattlePassExperience(
    progression: PlayerProgression,
    amount: number
  ): { tierUnlocked: boolean; newTier?: number } {
    progression.battlePassExperience += amount;

    let tierUnlocked = false;
    let newTier = progression.battlePassLevel;

    // Calculate tier progression
    const expPerTier = 1000;
    const newLevel = Math.floor(progression.battlePassExperience / expPerTier);

    if (newLevel > progression.battlePassLevel) {
      tierUnlocked = true;
      newTier = newLevel;
      progression.battlePassLevel = newLevel;

      this.emit('battle_pass_tier_unlocked', {
        newTier,
        timestamp: Date.now()
      });
    }

    return { tierUnlocked, newTier: tierUnlocked ? newTier : undefined };
  }

  // Utility methods
  private calculateExperienceRequired(level: number): number {
    return Math.floor(1000 * Math.pow(1.2, level - 1));
  }

  private calculateWeaponExperienceRequired(level: number): number {
    return Math.floor(500 * Math.pow(1.15, level - 1));
  }

  private checkWeaponUnlocks(weaponId: string, level: number): {
    attachments: string[];
    upgrades: string[];
  } {
    // Mock unlock system - would be data-driven
    const unlocks = { attachments: [] as string[], upgrades: [] as string[] };

    if (level === 5) unlocks.attachments.push(`${weaponId}_red_dot`);
    if (level === 10) unlocks.attachments.push(`${weaponId}_extended_mag`);
    if (level === 15) unlocks.upgrades.push(`${weaponId}_damage_boost`);

    return unlocks;
  }

  private updateWeaponMastery(weaponProg: WeaponProgression): void {
    // Calculate mastery based on level, kills, and headshot ratio
    const levelComponent = weaponProg.level * 10;
    const killsComponent = Math.min(weaponProg.kills * 2, 200);
    const headshotComponent = weaponProg.headshotKills > 0 ?
      (weaponProg.headshotKills / weaponProg.kills) * 50 : 0;

    weaponProg.masteryProgress = Math.min(100, levelComponent + killsComponent + headshotComponent);
  }

  private calculateAccuracyRating(stats: PlayerStatistics): number {
    // Simplified accuracy calculation
    if (stats.totalDamage === 0) return 0;
    return Math.min(100, stats.totalDamage / (stats.matchesPlayed * 1000) * 100);
  }

  private calculateSurvivalRating(stats: PlayerStatistics): number {
    if (stats.matchesPlayed === 0) return 0;
    const kdr = stats.totalDeaths === 0 ? stats.totalKills : stats.totalKills / stats.totalDeaths;
    return Math.min(100, kdr * 20);
  }

  private calculateTeamplayRating(stats: PlayerStatistics): number {
    if (stats.totalKills === 0) return 0;
    const assistRatio = stats.totalAssists / (stats.totalKills + stats.totalAssists);
    const healingRatio = stats.totalHealing / stats.totalDamage;
    return Math.min(100, (assistRatio + healingRatio) * 50);
  }
}

// Utility functions
export function calculateDistance3D(pos1: Vector3, pos2: Vector3): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function calculateDistance2D(pos1: Vector2, pos2: Vector2): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalizeVector3(vector: Vector3): Vector3 {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  if (magnitude === 0) return { x: 0, y: 0, z: 0 };

  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
    z: vector.z / magnitude
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function lerpVector3(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t)
  };
}

// Export all systems for use in game implementations
export default {
  CombatSystem,
  MovementSystem,
  EconomySystem,
  ProgressionSystem,
  calculateDistance3D,
  calculateDistance2D,
  normalizeVector3,
  lerp,
  lerpVector3
};