import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { multiplayerSocketService } from './MultiplayerSocketService';

export interface Friend {
  id: string;
  username: string;
  avatar: string;
  level: number;
  status: 'online' | 'offline' | 'in-game' | 'away';
  lastSeen: Date;
  winRate: number;
  totalGames: number;
  favoriteGame: string;
  currentGameCode?: string;
  mutualFriends: number;
  friendshipDate: Date;
  socialScore: number;
}

export interface Guild {
  id: string;
  name: string;
  tag: string;
  description: string;
  memberCount: number;
  maxMembers: number;
  level: number;
  xp: number;
  avatar: string;
  bannerColor: string;
  requirements: {
    minLevel: number;
    minWinRate?: number;
    minGamesPlayed?: number;
    applicationRequired?: boolean;
  };
  activities: string[];
  perks: string[];
  createdAt: Date;
  ownerId: string;
  officers: string[];
  members: Map<string, GuildMember>;
  stats: {
    totalGamesPlayed: number;
    totalWinnings: number;
    averageWinRate: number;
  };
}

export interface GuildMember {
  userId: string;
  username: string;
  role: 'member' | 'officer' | 'leader';
  joinedAt: Date;
  contribution: number;
  lastActive: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'guild' | 'friend' | 'global' | 'game';
  participants: string[];
  messages: ChatMessage[];
  isActive: boolean;
  lastActivity: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  roomId: string;
  content: string;
  type: 'text' | 'image' | 'game-invite' | 'achievement' | 'system' | 'emoji';
  timestamp: Date;
  metadata?: any;
  reactions: Map<string, string[]>; // emoji -> user IDs
  isEdited: boolean;
  replyTo?: string;
}

export interface GameInvite {
  id: string;
  fromUserId: string;
  toUserId: string;
  gameCode: string;
  gameName: string;
  message: string;
  stake?: number;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
}

export interface Achievement {
  id: string;
  userId: string;
  type: 'game' | 'social' | 'special';
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  progress?: {
    current: number;
    target: number;
  };
}

/**
 * Social Service
 * Manages friends, guilds, chat, and social interactions
 */
export class SocialService extends EventEmitter {
  private static instance: SocialService;
  private friends = new Map<string, Map<string, Friend>>();
  private guilds = new Map<string, Guild>();
  private chatRooms = new Map<string, ChatRoom>();
  private gameInvites = new Map<string, GameInvite>();
  private achievements = new Map<string, Achievement[]>();
  private userStatuses = new Map<string, { status: string; lastUpdate: Date }>();

  private constructor() {
    super();
    this.initializeMockData();
    this.startPeriodicTasks();
  }

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  /**
   * Initialize mock social data
   */
  private initializeMockData(): void {
    this.createMockGuilds();
    this.createMockChatRooms();
    logger.info('Social service initialized with mock data');
  }

  /**
   * Get user's friends list
   */
  getUserFriends(userId: string): Friend[] {
    const userFriends = this.friends.get(userId);
    if (!userFriends) {
      // Create mock friends for new users
      this.createMockFriends(userId);
      return Array.from(this.friends.get(userId)?.values() || []);
    }
    return Array.from(userFriends.values());
  }

  /**
   * Add friend relationship
   */
  async addFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      // In production, this would check if users exist and handle friend requests
      const mockFriend: Friend = {
        id: friendId,
        username: `Player_${friendId}`,
        avatar: this.getRandomAvatar(),
        level: Math.floor(Math.random() * 50) + 1,
        status: 'offline',
        lastSeen: new Date(),
        winRate: Math.random() * 0.5 + 0.3,
        totalGames: Math.floor(Math.random() * 200) + 10,
        favoriteGame: 'Battle Royale',
        mutualFriends: Math.floor(Math.random() * 10),
        friendshipDate: new Date(),
        socialScore: Math.floor(Math.random() * 1000) + 100
      };

      if (!this.friends.has(userId)) {
        this.friends.set(userId, new Map());
      }
      if (!this.friends.has(friendId)) {
        this.friends.set(friendId, new Map());
      }

      this.friends.get(userId)!.set(friendId, mockFriend);

      // Reciprocal relationship
      const reciprocalFriend: Friend = {
        ...mockFriend,
        id: userId,
        username: `Player_${userId}`
      };
      this.friends.get(friendId)!.set(userId, reciprocalFriend);

      this.emit('friendAdded', { userId, friendId });
      logger.info(`Friend relationship created between ${userId} and ${friendId}`);
      return true;
    } catch (error) {
      logger.error('Error adding friend:', error);
      return false;
    }
  }

  /**
   * Remove friend relationship
   */
  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      this.friends.get(userId)?.delete(friendId);
      this.friends.get(friendId)?.delete(userId);

      this.emit('friendRemoved', { userId, friendId });
      logger.info(`Friend relationship removed between ${userId} and ${friendId}`);
      return true;
    } catch (error) {
      logger.error('Error removing friend:', error);
      return false;
    }
  }

  /**
   * Update user status
   */
  updateUserStatus(userId: string, status: 'online' | 'offline' | 'in-game' | 'away', gameCode?: string): void {
    this.userStatuses.set(userId, { status, lastUpdate: new Date() });

    // Update status in friends lists
    for (const [friendsMapKey, friendsMap] of this.friends.entries()) {
      if (friendsMap.has(userId)) {
        const friend = friendsMap.get(userId)!;
        friend.status = status as any;
        friend.lastSeen = new Date();
        friend.currentGameCode = gameCode;
      }
    }

    this.emit('userStatusUpdated', { userId, status, gameCode });
  }

  /**
   * Get available guilds
   */
  getAvailableGuilds(): Guild[] {
    return Array.from(this.guilds.values());
  }

  /**
   * Get user's guild memberships
   */
  getUserGuilds(userId: string): Guild[] {
    return Array.from(this.guilds.values()).filter(guild =>
      guild.members.has(userId)
    );
  }

  /**
   * Join guild
   */
  async joinGuild(userId: string, guildId: string, userLevel: number, userWinRate: number): Promise<{success: boolean, message?: string}> {
    try {
      const guild = this.guilds.get(guildId);
      if (!guild) {
        return { success: false, message: 'Guild not found' };
      }

      // Check requirements
      if (userLevel < guild.requirements.minLevel) {
        return { success: false, message: `Minimum level ${guild.requirements.minLevel} required` };
      }

      if (guild.requirements.minWinRate && userWinRate < guild.requirements.minWinRate) {
        return { success: false, message: `Minimum win rate ${(guild.requirements.minWinRate * 100).toFixed(0)}% required` };
      }

      if (guild.memberCount >= guild.maxMembers) {
        return { success: false, message: 'Guild is full' };
      }

      if (guild.members.has(userId)) {
        return { success: false, message: 'Already a member of this guild' };
      }

      // Add member
      const newMember: GuildMember = {
        userId,
        username: `Player_${userId}`,
        role: 'member',
        joinedAt: new Date(),
        contribution: 0,
        lastActive: new Date()
      };

      guild.members.set(userId, newMember);
      guild.memberCount += 1;

      this.emit('guildJoined', { userId, guildId, guild });
      logger.info(`User ${userId} joined guild ${guildId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error joining guild:', error);
      return { success: false, message: 'Failed to join guild' };
    }
  }

  /**
   * Leave guild
   */
  async leaveGuild(userId: string, guildId: string): Promise<boolean> {
    try {
      const guild = this.guilds.get(guildId);
      if (!guild || !guild.members.has(userId)) {
        return false;
      }

      guild.members.delete(userId);
      guild.memberCount -= 1;

      this.emit('guildLeft', { userId, guildId });
      logger.info(`User ${userId} left guild ${guildId}`);
      return true;
    } catch (error) {
      logger.error('Error leaving guild:', error);
      return false;
    }
  }

  /**
   * Send chat message
   */
  async sendChatMessage(
    senderId: string,
    roomId: string,
    content: string,
    type: 'text' | 'image' | 'emoji' = 'text',
    metadata?: any
  ): Promise<ChatMessage | null> {
    try {
      const room = this.chatRooms.get(roomId);
      if (!room) {
        throw new Error('Chat room not found');
      }

      if (!room.participants.includes(senderId)) {
        throw new Error('User not in chat room');
      }

      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId,
        senderName: `Player_${senderId}`,
        senderAvatar: this.getRandomAvatar(),
        roomId,
        content: content.trim(),
        type,
        timestamp: new Date(),
        metadata,
        reactions: new Map(),
        isEdited: false
      };

      room.messages.push(message);
      room.lastActivity = new Date();

      // Keep only last 1000 messages per room
      if (room.messages.length > 1000) {
        room.messages = room.messages.slice(-1000);
      }

      this.emit('messageReceived', { roomId, message });
      logger.info(`Message sent in room ${roomId} by user ${senderId}`);

      return message;
    } catch (error) {
      logger.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Get chat messages for a room
   */
  getChatMessages(roomId: string, limit = 50, offset = 0): ChatMessage[] {
    const room = this.chatRooms.get(roomId);
    if (!room) return [];

    return room.messages
      .slice(-(offset + limit))
      .slice(-limit)
      .reverse();
  }

  /**
   * Send game invite
   */
  async sendGameInvite(
    fromUserId: string,
    toUserId: string,
    gameCode: string,
    gameName: string,
    message: string,
    stake?: number
  ): Promise<string | null> {
    try {
      const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const invite: GameInvite = {
        id: inviteId,
        fromUserId,
        toUserId,
        gameCode,
        gameName,
        message,
        stake,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        status: 'pending',
        createdAt: new Date()
      };

      this.gameInvites.set(inviteId, invite);

      this.emit('gameInviteSent', { invite });
      logger.info(`Game invite sent from ${fromUserId} to ${toUserId} for ${gameCode}`);

      return inviteId;
    } catch (error) {
      logger.error('Error sending game invite:', error);
      return null;
    }
  }

  /**
   * Get user's pending game invites
   */
  getUserGameInvites(userId: string): GameInvite[] {
    const now = new Date();
    return Array.from(this.gameInvites.values()).filter(invite =>
      invite.toUserId === userId &&
      invite.status === 'pending' &&
      invite.expiresAt > now
    );
  }

  /**
   * Accept game invite
   */
  async acceptGameInvite(inviteId: string): Promise<{success: boolean, invite?: GameInvite}> {
    try {
      const invite = this.gameInvites.get(inviteId);
      if (!invite) {
        return { success: false };
      }

      if (invite.status !== 'pending' || invite.expiresAt < new Date()) {
        return { success: false };
      }

      invite.status = 'accepted';

      this.emit('gameInviteAccepted', { invite });
      logger.info(`Game invite ${inviteId} accepted`);

      return { success: true, invite };
    } catch (error) {
      logger.error('Error accepting game invite:', error);
      return { success: false };
    }
  }

  /**
   * Decline game invite
   */
  async declineGameInvite(inviteId: string): Promise<boolean> {
    try {
      const invite = this.gameInvites.get(inviteId);
      if (!invite) return false;

      invite.status = 'declined';

      this.emit('gameInviteDeclined', { invite });
      logger.info(`Game invite ${inviteId} declined`);

      return true;
    } catch (error) {
      logger.error('Error declining game invite:', error);
      return false;
    }
  }

  /**
   * Add achievement for user
   */
  async addAchievement(userId: string, achievement: Omit<Achievement, 'id' | 'userId' | 'unlockedAt'>): Promise<void> {
    try {
      const newAchievement: Achievement = {
        id: `ach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        unlockedAt: new Date(),
        ...achievement
      };

      if (!this.achievements.has(userId)) {
        this.achievements.set(userId, []);
      }

      this.achievements.get(userId)!.push(newAchievement);

      this.emit('achievementUnlocked', { userId, achievement: newAchievement });
      logger.info(`Achievement unlocked for user ${userId}: ${achievement.name}`);
    } catch (error) {
      logger.error('Error adding achievement:', error);
    }
  }

  /**
   * Get user achievements
   */
  getUserAchievements(userId: string): Achievement[] {
    return this.achievements.get(userId) || [];
  }

  /**
   * Create mock friends for a user
   */
  private createMockFriends(userId: string): void {
    const mockFriends: Friend[] = [
      {
        id: 'friend1',
        username: 'GamerPro',
        avatar: '🎮',
        level: 25,
        status: 'online',
        lastSeen: new Date(Date.now() - 2 * 60 * 1000),
        winRate: 0.75,
        totalGames: 150,
        favoriteGame: 'Battle Royale',
        currentGameCode: 'crypto-battle-royale',
        mutualFriends: 5,
        friendshipDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        socialScore: 850
      },
      {
        id: 'friend2',
        username: 'ChessWizard',
        avatar: '♟️',
        level: 30,
        status: 'in-game',
        lastSeen: new Date(),
        winRate: 0.82,
        totalGames: 200,
        favoriteGame: 'Speed Chess',
        currentGameCode: 'speed-chess',
        mutualFriends: 3,
        friendshipDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        socialScore: 920
      },
      {
        id: 'friend3',
        username: 'PokerFace',
        avatar: '🃏',
        level: 20,
        status: 'offline',
        lastSeen: new Date(Date.now() - 60 * 60 * 1000),
        winRate: 0.68,
        totalGames: 120,
        favoriteGame: 'AI Poker',
        mutualFriends: 8,
        friendshipDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        socialScore: 740
      }
    ];

    const userFriendsMap = new Map<string, Friend>();
    mockFriends.forEach(friend => {
      userFriendsMap.set(friend.id, friend);
    });

    this.friends.set(userId, userFriendsMap);
  }

  /**
   * Create mock guilds
   */
  private createMockGuilds(): void {
    const mockGuilds: Omit<Guild, 'members'>[] = [
      {
        id: 'guild1',
        name: 'Elite Gamers',
        tag: 'ELITE',
        description: 'Top-tier competitive gaming guild. Only the best players.',
        memberCount: 45,
        maxMembers: 50,
        level: 15,
        xp: 125000,
        avatar: '⚔️',
        bannerColor: '#FF4444',
        requirements: {
          minLevel: 20,
          minWinRate: 0.70,
          minGamesPlayed: 100
        },
        activities: ['Daily tournaments', 'Strategy sessions', 'Skill training'],
        perks: ['10% bonus XP', 'Exclusive tournaments', 'Priority matchmaking'],
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        ownerId: 'owner1',
        officers: ['officer1', 'officer2'],
        stats: {
          totalGamesPlayed: 5000,
          totalWinnings: 2500000,
          averageWinRate: 0.72
        }
      },
      {
        id: 'guild2',
        name: 'Casual Legends',
        tag: 'CASU',
        description: 'Friendly community for casual gamers who love to have fun!',
        memberCount: 38,
        maxMembers: 40,
        level: 8,
        xp: 65000,
        avatar: '🎯',
        bannerColor: '#4CAF50',
        requirements: {
          minLevel: 5
        },
        activities: ['Friendly matches', 'Social events', 'Beginner guides'],
        perks: ['Weekly rewards', 'Mentorship program', 'Social events'],
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        ownerId: 'owner2',
        officers: ['officer3'],
        stats: {
          totalGamesPlayed: 2000,
          totalWinnings: 800000,
          averageWinRate: 0.55
        }
      }
    ];

    mockGuilds.forEach(guildData => {
      const guild: Guild = {
        ...guildData,
        members: new Map()
      };

      // Add mock members
      for (let i = 0; i < guildData.memberCount; i++) {
        const member: GuildMember = {
          userId: `member_${guildData.id}_${i}`,
          username: `Player${i}`,
          role: i === 0 ? 'leader' : i < 3 ? 'officer' : 'member',
          joinedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          contribution: Math.floor(Math.random() * 1000),
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        };
        guild.members.set(member.userId, member);
      }

      this.guilds.set(guild.id, guild);
    });
  }

  /**
   * Create mock chat rooms
   */
  private createMockChatRooms(): void {
    const globalRoom: ChatRoom = {
      id: 'global',
      name: 'Global Chat',
      type: 'global',
      participants: ['user1', 'user2', 'user3', 'user4', 'user5'],
      messages: [
        {
          id: 'msg1',
          senderId: 'user1',
          senderName: 'GamerPro',
          senderAvatar: '🎮',
          roomId: 'global',
          content: 'Anyone up for a quick battle royale match?',
          type: 'text',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          metadata: null,
          reactions: new Map(),
          isEdited: false
        },
        {
          id: 'msg2',
          senderId: 'user2',
          senderName: 'ChessWizard',
          senderAvatar: '♟️',
          roomId: 'global',
          content: 'Just won a chess tournament! 🏆',
          type: 'achievement',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          metadata: { achievement: 'Chess Master', game: 'speed-chess' },
          reactions: new Map([['🎉', ['user1', 'user3']], ['👏', ['user4']]]),
          isEdited: false
        }
      ],
      isActive: true,
      lastActivity: new Date(Date.now() - 5 * 60 * 1000)
    };

    this.chatRooms.set('global', globalRoom);
  }

  /**
   * Start periodic maintenance tasks
   */
  private startPeriodicTasks(): void {
    // Clean up expired invites every 5 minutes
    setInterval(() => {
      this.cleanupExpiredInvites();
    }, 5 * 60 * 1000);

    // Update user activity status every minute
    setInterval(() => {
      this.updateUserActivities();
    }, 60 * 1000);
  }

  /**
   * Clean up expired game invites
   */
  private cleanupExpiredInvites(): void {
    const now = new Date();
    const expiredInvites: string[] = [];

    for (const [inviteId, invite] of this.gameInvites.entries()) {
      if (invite.expiresAt < now && invite.status === 'pending') {
        invite.status = 'expired';
        expiredInvites.push(inviteId);
      }
    }

    expiredInvites.forEach(inviteId => {
      setTimeout(() => {
        this.gameInvites.delete(inviteId);
      }, 24 * 60 * 60 * 1000); // Keep expired invites for 24 hours
    });

    if (expiredInvites.length > 0) {
      logger.info(`Cleaned up ${expiredInvites.length} expired game invites`);
    }
  }

  /**
   * Update user activity statuses
   */
  private updateUserActivities(): void {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [userId, statusData] of this.userStatuses.entries()) {
      if (statusData.status === 'online' &&
          now.getTime() - statusData.lastUpdate.getTime() > inactiveThreshold) {
        this.updateUserStatus(userId, 'away');
      }
    }
  }

  /**
   * Helper methods
   */
  private getRandomAvatar(): string {
    const avatars = ['🎮', '⚔️', '🏆', '👑', '💎', '🔥', '⚡', '🚀', '🦄', '🐉', '♟️', '🃏', '🎯', '🎪', '🎨'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }
}

export const socialService = SocialService.getInstance();