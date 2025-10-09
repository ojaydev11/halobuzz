import { heroes } from '../data/heroes';
import { heroesSniper, heroesSpecialist } from '../data/heroes-sniper-specialist';
import { logger } from '../config/logger';

/**
 * HaloClash Auto-Battler Service
 *
 * Core combat engine for HaloClash - the strategic auto-battler game mode.
 * Players draft heroes, position them on a grid, and watch them battle automatically.
 *
 * Game Flow:
 * 1. Draft Phase: Players pick heroes from a shared pool
 * 2. Positioning Phase: Place heroes on 4x4 grid (front/mid/back lines)
 * 3. Combat Phase: Heroes auto-battle using AI targeting
 * 4. Victory: Last team standing wins
 *
 * Strategy:
 * - Front line: Tanks absorb damage
 * - Mid line: Assault/Specialist deal damage
 * - Back line: Support/Sniper provide utility/burst
 */

// Combat constants
const COMBAT_CONFIG = {
  TICK_RATE: 100, // Combat updates every 100ms
  AUTO_ATTACK_INTERVAL: 1000, // Basic attacks every 1s
  ABILITY_COOLDOWN_MULTIPLIER: 1.0,
  ULTIMATE_CHARGE_RATE: 0.015, // 1.5% ult charge per 100ms in combat
  CRITICAL_HIT_CHANCE: 0.15,
  CRITICAL_HIT_MULTIPLIER: 1.5,
  SHIELD_REGEN_DELAY: 3000, // 3s out of combat
  SHIELD_REGEN_RATE: 50, // 50 shield per tick
  MAX_COMBAT_DURATION: 180000, // 3 minutes max
};

// Grid positions
export type GridPosition = {
  row: 0 | 1 | 2 | 3; // 0=front, 3=back
  col: 0 | 1 | 2 | 3;
};

// Hero instance in battle
export interface BattleHero {
  id: string;
  heroId: string;
  heroData: any; // From heroes.ts
  team: 'blue' | 'red';
  position: GridPosition;

  // Current stats
  currentHealth: number;
  currentShield: number;
  currentMana: number;
  ultCharge: number; // 0-100

  // Status
  isAlive: boolean;
  isDead: boolean;
  isCasting: boolean;
  isStunned: boolean;
  lastDamageTaken: number; // timestamp

  // Cooldowns
  abilityCooldowns: Map<string, number>; // abilityId -> ready timestamp
  autoAttackReady: number; // timestamp

  // Combat stats
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  killsCount: number;
  deathTime?: number;
}

// Combat action
export interface CombatAction {
  timestamp: number;
  heroId: string;
  actionType: 'auto_attack' | 'ability' | 'ultimate' | 'death' | 'heal';
  targetId?: string;
  abilityId?: string;
  damage?: number;
  healing?: number;
  isCritical?: boolean;
}

// Battle result
export interface BattleResult {
  winner: 'blue' | 'red' | 'draw';
  duration: number;
  combatLog: CombatAction[];
  finalState: {
    blueTeam: BattleHero[];
    redTeam: BattleHero[];
  };
  mvp: {
    heroId: string;
    damageDealt: number;
    healingDone: number;
  };
}

export class HaloClashService {
  private static instance: HaloClashService;
  private allHeroes: any[];

  private constructor() {
    // Combine all hero data
    this.allHeroes = [...heroes, ...heroesSniper, ...heroesSpecialist];
  }

  static getInstance(): HaloClashService {
    if (!HaloClashService.instance) {
      HaloClashService.instance = new HaloClashService();
    }
    return HaloClashService.instance;
  }

  /**
   * Start a battle between two teams
   */
  async simulateBattle(
    blueTeam: Array<{ heroId: string; position: GridPosition }>,
    redTeam: Array<{ heroId: string; position: GridPosition }>
  ): Promise<BattleResult> {
    logger.info('Starting HaloClash battle simulation');

    // Initialize battle heroes
    const blueHeroes = blueTeam.map((h, i) => this.createBattleHero(h.heroId, h.position, 'blue', `blue-${i}`));
    const redHeroes = redTeam.map((h, i) => this.createBattleHero(h.heroId, h.position, 'red', `red-${i}`));

    const combatLog: CombatAction[] = [];
    let currentTime = 0;

    // Combat loop
    while (currentTime < COMBAT_CONFIG.MAX_COMBAT_DURATION) {
      currentTime += COMBAT_CONFIG.TICK_RATE;

      // Check victory condition
      const blueAlive = blueHeroes.filter(h => h.isAlive).length;
      const redAlive = redHeroes.filter(h => h.isAlive).length;

      if (blueAlive === 0 || redAlive === 0) {
        break;
      }

      // Update all heroes
      for (const hero of [...blueHeroes, ...redHeroes]) {
        if (!hero.isAlive) continue;

        // Shield regeneration
        this.updateShieldRegen(hero, currentTime);

        // Ultimate charge
        hero.ultCharge = Math.min(100, hero.ultCharge + COMBAT_CONFIG.ULTIMATE_CHARGE_RATE);

        // Try to cast ultimate
        if (hero.ultCharge >= 100 && !hero.isCasting) {
          const enemyTeam = hero.team === 'blue' ? redHeroes : blueHeroes;
          const action = this.tryUltimate(hero, enemyTeam, currentTime);
          if (action) {
            combatLog.push(action);
            hero.ultCharge = 0;
          }
        }

        // Try to cast abilities
        if (!hero.isCasting && !hero.isStunned) {
          const enemyTeam = hero.team === 'blue' ? redHeroes : blueHeroes;
          const friendlyTeam = hero.team === 'blue' ? blueHeroes : redHeroes;
          const action = this.tryAbility(hero, enemyTeam, friendlyTeam, currentTime);
          if (action) {
            combatLog.push(action);
          }
        }

        // Auto attack
        if (currentTime >= hero.autoAttackReady && !hero.isCasting && !hero.isStunned) {
          const enemyTeam = hero.team === 'blue' ? redHeroes : blueHeroes;
          const action = this.performAutoAttack(hero, enemyTeam, currentTime);
          if (action) {
            combatLog.push(action);
            hero.autoAttackReady = currentTime + COMBAT_CONFIG.AUTO_ATTACK_INTERVAL;
          }
        }
      }
    }

    // Determine winner
    const blueAlive = blueHeroes.filter(h => h.isAlive).length;
    const redAlive = redHeroes.filter(h => h.isAlive).length;

    let winner: 'blue' | 'red' | 'draw';
    if (blueAlive > redAlive) {
      winner = 'blue';
    } else if (redAlive > blueAlive) {
      winner = 'red';
    } else {
      winner = 'draw';
    }

    // Find MVP
    const allHeroes = [...blueHeroes, ...redHeroes];
    const mvp = allHeroes.reduce((best, hero) => {
      const score = hero.damageDealt + hero.healingDone * 0.5;
      const bestScore = best.damageDealt + best.healingDone * 0.5;
      return score > bestScore ? hero : best;
    });

    logger.info(`Battle complete: ${winner} wins in ${currentTime}ms`);

    return {
      winner,
      duration: currentTime,
      combatLog,
      finalState: {
        blueTeam: blueHeroes,
        redTeam: redHeroes,
      },
      mvp: {
        heroId: mvp.id,
        damageDealt: mvp.damageDealt,
        healingDone: mvp.healingDone,
      },
    };
  }

  /**
   * Create a battle hero instance
   */
  private createBattleHero(
    heroId: string,
    position: GridPosition,
    team: 'blue' | 'red',
    id: string
  ): BattleHero {
    const heroData = this.allHeroes.find(h => h.id === heroId);
    if (!heroData) {
      throw new Error(`Hero not found: ${heroId}`);
    }

    return {
      id,
      heroId,
      heroData,
      team,
      position,
      currentHealth: heroData.baseStats.health,
      currentShield: heroData.baseStats.shield,
      currentMana: 100,
      ultCharge: 0,
      isAlive: true,
      isDead: false,
      isCasting: false,
      isStunned: false,
      lastDamageTaken: 0,
      abilityCooldowns: new Map(),
      autoAttackReady: 0,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      killsCount: 0,
    };
  }

  /**
   * Update shield regeneration
   */
  private updateShieldRegen(hero: BattleHero, currentTime: number): void {
    if (currentTime - hero.lastDamageTaken >= COMBAT_CONFIG.SHIELD_REGEN_DELAY) {
      const maxShield = hero.heroData.baseStats.shield;
      if (hero.currentShield < maxShield) {
        hero.currentShield = Math.min(maxShield, hero.currentShield + COMBAT_CONFIG.SHIELD_REGEN_RATE);
      }
    }
  }

  /**
   * Try to cast ultimate ability
   */
  private tryUltimate(
    hero: BattleHero,
    enemyTeam: BattleHero[],
    currentTime: number
  ): CombatAction | null {
    const ultimate = hero.heroData.abilities.find((a: any) => a.type === 'ultimate');
    if (!ultimate) return null;

    const target = this.findTarget(hero, enemyTeam);
    if (!target) return null;

    // Apply damage
    const damage = this.calculateDamage(hero, ultimate.damage || 0);
    this.applyDamage(target, damage, currentTime);

    hero.damageDealt += damage;
    hero.isCasting = true;

    // Reset casting after animation (simulate)
    setTimeout(() => {
      hero.isCasting = false;
    }, 1000);

    return {
      timestamp: currentTime,
      heroId: hero.id,
      actionType: 'ultimate',
      targetId: target.id,
      abilityId: ultimate.id,
      damage,
      isCritical: false,
    };
  }

  /**
   * Try to cast active ability
   */
  private tryAbility(
    hero: BattleHero,
    enemyTeam: BattleHero[],
    friendlyTeam: BattleHero[],
    currentTime: number
  ): CombatAction | null {
    // Find an ability that's off cooldown
    const activeAbilities = hero.heroData.abilities.filter((a: any) => a.type === 'active');

    for (const ability of activeAbilities) {
      const cooldownEnd = hero.abilityCooldowns.get(ability.id) || 0;
      if (currentTime >= cooldownEnd) {
        // Check if it's a healing ability
        if (ability.healing) {
          const target = this.findHealTarget(friendlyTeam);
          if (target && target.currentHealth < target.heroData.baseStats.health * 0.7) {
            const healing = ability.healing;
            this.applyHealing(target, healing);
            hero.healingDone += healing;

            // Set cooldown
            hero.abilityCooldowns.set(
              ability.id,
              currentTime + ability.cooldown * COMBAT_CONFIG.ABILITY_COOLDOWN_MULTIPLIER
            );

            return {
              timestamp: currentTime,
              heroId: hero.id,
              actionType: 'heal',
              targetId: target.id,
              abilityId: ability.id,
              healing,
            };
          }
        } else if (ability.damage) {
          // Damage ability
          const target = this.findTarget(hero, enemyTeam);
          if (target) {
            const damage = this.calculateDamage(hero, ability.damage);
            this.applyDamage(target, damage, currentTime);
            hero.damageDealt += damage;

            // Set cooldown
            hero.abilityCooldowns.set(
              ability.id,
              currentTime + ability.cooldown * COMBAT_CONFIG.ABILITY_COOLDOWN_MULTIPLIER
            );

            return {
              timestamp: currentTime,
              heroId: hero.id,
              actionType: 'ability',
              targetId: target.id,
              abilityId: ability.id,
              damage,
              isCritical: false,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Perform auto attack
   */
  private performAutoAttack(
    hero: BattleHero,
    enemyTeam: BattleHero[],
    currentTime: number
  ): CombatAction | null {
    const target = this.findTarget(hero, enemyTeam);
    if (!target) return null;

    // Calculate damage
    const baseDamage = hero.heroData.baseStats.damage;
    const isCritical = Math.random() < COMBAT_CONFIG.CRITICAL_HIT_CHANCE;
    const damage = this.calculateDamage(
      hero,
      baseDamage * (isCritical ? COMBAT_CONFIG.CRITICAL_HIT_MULTIPLIER : 1)
    );

    this.applyDamage(target, damage, currentTime);
    hero.damageDealt += damage;

    // Grant ult charge
    hero.ultCharge = Math.min(100, hero.ultCharge + 1.5);

    return {
      timestamp: currentTime,
      heroId: hero.id,
      actionType: 'auto_attack',
      targetId: target.id,
      damage,
      isCritical,
    };
  }

  /**
   * Find best target for attack
   * Priority: Closest row, lowest health, highest threat
   */
  private findTarget(hero: BattleHero, enemyTeam: BattleHero[]): BattleHero | null {
    const aliveEnemies = enemyTeam.filter(e => e.isAlive);
    if (aliveEnemies.length === 0) return null;

    // Sort by distance (row difference)
    const range = hero.heroData.baseStats.range || 500;

    // Sniper/Support can hit back line
    if (range > 600) {
      // Target lowest health percentage
      return aliveEnemies.reduce((best, enemy) => {
        const bestHealthPct = (best.currentHealth + best.currentShield) /
                              (best.heroData.baseStats.health + best.heroData.baseStats.shield);
        const enemyHealthPct = (enemy.currentHealth + enemy.currentShield) /
                               (enemy.heroData.baseStats.health + enemy.heroData.baseStats.shield);
        return enemyHealthPct < bestHealthPct ? enemy : best;
      });
    } else {
      // Melee/short range: target front line first
      const frontLine = aliveEnemies.filter(e => e.position.row === 0);
      const targets = frontLine.length > 0 ? frontLine : aliveEnemies;

      return targets.reduce((best, enemy) => {
        const bestHealthPct = (best.currentHealth + best.currentShield) /
                              (best.heroData.baseStats.health + best.heroData.baseStats.shield);
        const enemyHealthPct = (enemy.currentHealth + enemy.currentShield) /
                               (enemy.heroData.baseStats.health + enemy.heroData.baseStats.shield);
        return enemyHealthPct < bestHealthPct ? enemy : best;
      });
    }
  }

  /**
   * Find ally that needs healing most
   */
  private findHealTarget(friendlyTeam: BattleHero[]): BattleHero | null {
    const injured = friendlyTeam.filter(f =>
      f.isAlive && f.currentHealth < f.heroData.baseStats.health
    );

    if (injured.length === 0) return null;

    return injured.reduce((best, ally) => {
      const bestHealthPct = best.currentHealth / best.heroData.baseStats.health;
      const allyHealthPct = ally.currentHealth / ally.heroData.baseStats.health;
      return allyHealthPct < bestHealthPct ? ally : best;
    });
  }

  /**
   * Calculate final damage after modifiers
   */
  private calculateDamage(attacker: BattleHero, baseDamage: number): number {
    // Apply role modifiers
    let damage = baseDamage;

    // Assault: +10% damage
    if (attacker.heroData.role === 'assault') {
      damage *= 1.1;
    }

    // Specialist: +15% ability damage (simplified)
    if (attacker.heroData.role === 'specialist') {
      damage *= 1.15;
    }

    return Math.round(damage);
  }

  /**
   * Apply damage to target
   */
  private applyDamage(target: BattleHero, damage: number, currentTime: number): void {
    target.lastDamageTaken = currentTime;

    // Shield absorbs first
    if (target.currentShield > 0) {
      const shieldDamage = Math.min(target.currentShield, damage);
      target.currentShield -= shieldDamage;
      damage -= shieldDamage;
    }

    // Then health
    if (damage > 0) {
      target.currentHealth -= damage;
      target.damageTaken += damage;
    }

    // Check death
    if (target.currentHealth <= 0) {
      target.isAlive = false;
      target.isDead = true;
      target.deathTime = currentTime;
    }
  }

  /**
   * Apply healing to target
   */
  private applyHealing(target: BattleHero, healing: number): void {
    const maxHealth = target.heroData.baseStats.health;
    const healAmount = Math.min(healing, maxHealth - target.currentHealth);
    target.currentHealth += healAmount;
  }

  /**
   * Get hero pool for draft
   */
  getHeroPool(): any[] {
    return this.allHeroes;
  }

  /**
   * Validate team composition
   */
  validateTeam(team: Array<{ heroId: string; position: GridPosition }>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check team size
    if (team.length < 3 || team.length > 5) {
      errors.push('Team must have 3-5 heroes');
    }

    // Check duplicate heroes
    const heroIds = team.map(h => h.heroId);
    if (new Set(heroIds).size !== heroIds.length) {
      errors.push('No duplicate heroes allowed');
    }

    // Check duplicate positions
    const positions = team.map(h => `${h.position.row}-${h.position.col}`);
    if (new Set(positions).size !== positions.length) {
      errors.push('No duplicate positions allowed');
    }

    // Check position validity
    for (const member of team) {
      if (member.position.row < 0 || member.position.row > 3) {
        errors.push('Invalid row position');
      }
      if (member.position.col < 0 || member.position.col > 3) {
        errors.push('Invalid column position');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const haloClashService = HaloClashService.getInstance();
