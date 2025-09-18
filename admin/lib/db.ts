// Simple database interface for admin users
// This is a lightweight solution that can be easily replaced with MongoDB later

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  roles: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  metadata?: {
    lastLoginIP?: string;
    failedLoginAttempts?: number;
    lockoutUntil?: string;
  };
}

// In-memory storage for development (replace with MongoDB in production)
let adminUsers: AdminUser[] = [];

// Simple password hashing (replace with bcrypt in production)
function simpleHash(password: string): string {
  // This is NOT secure - use bcrypt in production
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

export class AdminDB {
  static async initialize() {
    // Create default super admin if no users exist
    if (adminUsers.length === 0) {
      const defaultAdmin: AdminUser = {
        id: 'admin-001',
        username: 'superadmin',
        email: 'admin@halobuzz.com',
        passwordHash: simpleHash('HaloBuzz2024!'), // Default password
        roles: ['super-admin'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system'
      };
      adminUsers.push(defaultAdmin);

      // Add demo users for testing
      const demoUsers: AdminUser[] = [
        {
          id: 'admin-002',
          username: 'admin',
          email: 'admin.user@halobuzz.com',
          passwordHash: simpleHash('Admin123!'),
          roles: ['admin'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'admin-001'
        },
        {
          id: 'admin-003',
          username: 'moderator',
          email: 'moderator@halobuzz.com',
          passwordHash: simpleHash('Mod123!'),
          roles: ['moderator'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'admin-001'
        },
        {
          id: 'admin-004',
          username: 'support',
          email: 'support@halobuzz.com',
          passwordHash: simpleHash('Support123!'),
          roles: ['support'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'admin-001'
        }
      ];
      adminUsers.push(...demoUsers);
    }
  }

  static async findUserByCredentials(username: string, password: string): Promise<AdminUser | null> {
    const passwordHash = simpleHash(password);
    const user = adminUsers.find(u =>
      (u.username === username || u.email === username) &&
      u.passwordHash === passwordHash &&
      u.isActive
    );

    if (user) {
      // Update last login
      user.lastLogin = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
    }

    return user || null;
  }

  static async findUserById(id: string): Promise<AdminUser | null> {
    return adminUsers.find(u => u.id === id && u.isActive) || null;
  }

  static async findUserByUsername(username: string): Promise<AdminUser | null> {
    return adminUsers.find(u => u.username === username && u.isActive) || null;
  }

  static async createUser(userData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminUser> {
    const newUser: AdminUser = {
      ...userData,
      id: `admin-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    adminUsers.push(newUser);
    return newUser;
  }

  static async updateUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | null> {
    const userIndex = adminUsers.findIndex(u => u.id === id);
    if (userIndex === -1) return null;

    adminUsers[userIndex] = {
      ...adminUsers[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return adminUsers[userIndex];
  }

  static async getAllUsers(): Promise<AdminUser[]> {
    return adminUsers.filter(u => u.isActive);
  }

  static async deleteUser(id: string): Promise<boolean> {
    const userIndex = adminUsers.findIndex(u => u.id === id);
    if (userIndex === -1) return false;

    // Soft delete
    adminUsers[userIndex].isActive = false;
    adminUsers[userIndex].updatedAt = new Date().toISOString();

    return true;
  }

  static hashPassword(password: string): string {
    return simpleHash(password);
  }

  static verifyPassword(password: string, hash: string): boolean {
    return simpleHash(password) === hash;
  }
}

// Initialize database on import
AdminDB.initialize();