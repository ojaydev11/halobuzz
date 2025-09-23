import { UserProfile } from './types';
export declare function hasRole(user: UserProfile, role: 'admin' | 'moderator' | 'host' | 'user'): boolean;
export declare function canGhostMode(user: UserProfile): boolean;
export declare function canDeleteMessages(user: UserProfile): boolean;
