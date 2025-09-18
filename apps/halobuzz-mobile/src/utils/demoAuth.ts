// Demo authentication for development
export interface DemoUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  country: string;
  language: string;
  isVerified: boolean;
  kycStatus: 'verified' | 'pending' | 'rejected';
  ageVerified: boolean;
  totalCoinsEarned: number;
  coins: number;
  followers: number;
  following: number;
  totalLikes: number;
  totalViews: number;
  ogLevel: number;
}

export const demoUsers: DemoUser[] = [
  {
    id: 'demo_user_1',
    username: 'demo_user',
    email: 'demo@halobuzz.com',
    displayName: 'Demo User',
    country: 'US',
    language: 'en',
    isVerified: true,
    kycStatus: 'verified',
    ageVerified: true,
    totalCoinsEarned: 1000,
    coins: 500,
    followers: 150,
    following: 75,
    totalLikes: 2500,
    totalViews: 15000,
    ogLevel: 3
  },
  {
    id: 'test_user_1',
    username: 'test_user',
    email: 'test@halobuzz.com',
    displayName: 'Test User',
    country: 'CA',
    language: 'en',
    isVerified: true,
    kycStatus: 'verified',
    ageVerified: true,
    totalCoinsEarned: 500,
    coins: 250,
    followers: 50,
    following: 25,
    totalLikes: 1000,
    totalViews: 5000,
    ogLevel: 2
  },
  {
    id: 'admin_demo_1',
    username: 'admin_demo',
    email: 'admin@halobuzz.com',
    displayName: 'Admin Demo',
    country: 'US',
    language: 'en',
    isVerified: true,
    kycStatus: 'verified',
    ageVerified: true,
    totalCoinsEarned: 5000,
    coins: 2000,
    followers: 500,
    following: 100,
    totalLikes: 10000,
    totalViews: 50000,
    ogLevel: 5
  }
];

export const demoCredentials = [
  { username: 'demo_user', password: 'Demo123!', email: 'demo@halobuzz.com' },
  { username: 'test_user', password: 'Test123!', email: 'test@halobuzz.com' },
  { username: 'admin_demo', password: 'Admin123!', email: 'admin@halobuzz.com' }
];

export function validateDemoCredentials(identifier: string, password: string): DemoUser | null {
  const credential = demoCredentials.find(
    cred => cred.username === identifier || cred.email === identifier
  );
  
  if (credential && credential.password === password) {
    return demoUsers.find(user => user.username === credential.username) || null;
  }
  
  return null;
}

export function generateDemoToken(user: DemoUser): string {
  // Simple demo token (in real app, this would be a proper JWT)
  return `demo_token_${user.id}_${Date.now()}`;
}

