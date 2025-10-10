/**
 * Standardized Haptic Feedback for Games
 * Uses expo-haptics with user preference checking
 */

import * as Haptics from 'expo-haptics';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

class HapticFeedback {
  private static instance: HapticFeedback;
  private isEnabled: boolean = true;

  private constructor() {}

  static getInstance(): HapticFeedback {
    if (!HapticFeedback.instance) {
      HapticFeedback.instance = new HapticFeedback();
    }
    return HapticFeedback.instance;
  }

  /**
   * Enable/disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if haptics are enabled
   */
  isHapticsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Trigger haptic feedback by pattern
   */
  async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      switch (pattern) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;

        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;

        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;

        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;

        case 'selection':
          await Haptics.selectionAsync();
          break;

        default:
          console.warn(`Unknown haptic pattern: ${pattern}`);
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Custom haptic patterns for specific game events
   */
  async coinFlip(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('medium');
  }

  async coinLanding(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('heavy');
  }

  async tapCorrect(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('success');
  }

  async tapWrong(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('error');
  }

  async jump(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('light');
  }

  async coinPickup(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('selection');
  }

  async powerupCollect(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('medium');
  }

  async crash(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('heavy');
  }

  async blockDrop(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('light');
  }

  async perfectStack(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('success');
  }

  async towerCollapse(): Promise<void> {
    if (!this.isEnabled) return;
    // Double heavy impact for emphasis
    await this.trigger('heavy');
    setTimeout(() => this.trigger('heavy'), 100);
  }

  async projectileShoot(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('light');
  }

  async projectileHit(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('medium');
  }

  async gameVictory(): Promise<void> {
    if (!this.isEnabled) return;
    // Success pattern with multiple impacts
    await this.trigger('success');
    setTimeout(() => this.trigger('success'), 150);
  }

  async gameDefeat(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('error');
  }

  async answerCorrect(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('success');
  }

  async answerWrong(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('error');
  }

  async countdown(): Promise<void> {
    if (!this.isEnabled) return;
    await this.trigger('selection');
  }
}

export const hapticFeedback = HapticFeedback.getInstance();
export default hapticFeedback;

