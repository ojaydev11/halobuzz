import { UserProfile } from './types';

export function hasRole(user: UserProfile, role: 'admin' | 'moderator' | 'host' | 'user'): boolean {
  return user.roles.includes(role);
}

export function canGhostMode(user: UserProfile): boolean {
  return user.ogLevel >= 4;
}

export function canDeleteMessages(user: UserProfile): boolean {
  return user.ogLevel >= 4 || user.roles.includes('moderator') || user.roles.includes('admin');
}

