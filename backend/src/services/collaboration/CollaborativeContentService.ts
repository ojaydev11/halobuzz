import { Schema, model, Document } from 'mongoose';
import { logger } from '@/config/logger';
import { redisClient } from '@/config/redis';
import { io } from '@/config/socket';

// Interfaces
export interface CollaborationSession {
  sessionId: string;
  creatorId: string;
  participants: string[];
  contentType: 'video' | 'audio' | 'image' | 'text';
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  permissions: {
    canEdit: string[];
    canComment: string[];
    canView: string[];
  };
  content: {
    title: string;
    description: string;
    mediaUrl?: string;
    metadata: any;
  };
  timeline: CollaborationEvent[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface CollaborationEvent {
  eventId: string;
  userId: string;
  type: 'edit' | 'comment' | 'approve' | 'reject' | 'join' | 'leave';
  timestamp: Date;
  data: any;
  version: number;
}

export interface RealTimeEdit {
  editId: string;
  userId: string;
  sessionId: string;
  type: 'text' | 'media' | 'metadata';
  changes: any;
  timestamp: Date;
  applied: boolean;
}

export interface CollaborationInvite {
  inviteId: string;
  sessionId: string;
  inviterId: string;
  inviteeId: string;
  role: 'editor' | 'viewer' | 'commenter';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

// Mongoose Schemas
const CollaborationEventSchema = new Schema<CollaborationEvent>({
  eventId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['edit', 'comment', 'approve', 'reject', 'join', 'leave'], required: true },
  timestamp: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed, required: true },
  version: { type: Number, required: true }
});

const CollaborationSessionSchema = new Schema<CollaborationSession>({
  sessionId: { type: String, required: true, unique: true },
  creatorId: { type: String, required: true },
  participants: [{ type: String, required: true }],
  contentType: { type: String, enum: ['video', 'audio', 'image', 'text'], required: true },
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active' },
  permissions: {
    canEdit: [{ type: String }],
    canComment: [{ type: String }],
    canView: [{ type: String }]
  },
  content: {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    mediaUrl: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  timeline: [CollaborationEventSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

const RealTimeEditSchema = new Schema<RealTimeEdit>({
  editId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  sessionId: { type: String, required: true },
  type: { type: String, enum: ['text', 'media', 'metadata'], required: true },
  changes: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now },
  applied: { type: Boolean, default: false }
});

const CollaborationInviteSchema = new Schema<CollaborationInvite>({
  inviteId: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true },
  inviterId: { type: String, required: true },
  inviteeId: { type: String, required: true },
  role: { type: String, enum: ['editor', 'viewer', 'commenter'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Models
const CollaborationSessionModel = model<CollaborationSession & Document>('CollaborationSession', CollaborationSessionSchema);
const RealTimeEditModel = model<RealTimeEdit & Document>('RealTimeEdit', RealTimeEditSchema);
const CollaborationInviteModel = model<CollaborationInvite & Document>('CollaborationInvite', CollaborationInviteSchema);

export class CollaborativeContentService {
  private static instance: CollaborativeContentService;

  public static getInstance(): CollaborativeContentService {
    if (!CollaborativeContentService.instance) {
      CollaborativeContentService.instance = new CollaborativeContentService();
    }
    return CollaborativeContentService.instance;
  }

  /**
   * Create a new collaboration session
   */
  async createCollaborationSession(
    creatorId: string,
    contentType: 'video' | 'audio' | 'image' | 'text',
    content: { title: string; description: string; mediaUrl?: string; metadata?: any },
    duration: number = 24 // hours
  ): Promise<CollaborationSession> {
    try {
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

      const session: CollaborationSession = {
        sessionId,
        creatorId,
        participants: [creatorId],
        contentType,
        status: 'active',
        permissions: {
          canEdit: [creatorId],
          canComment: [creatorId],
          canView: [creatorId]
        },
        content,
        timeline: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt
      };

      const createdSession = await CollaborationSessionModel.create(session);
      
      // Cache session for real-time access
      await redisClient.setex(
        `collab:session:${sessionId}`,
        3600, // 1 hour cache
        JSON.stringify(session)
      );

      // Add initial event to timeline
      await this.addTimelineEvent(sessionId, creatorId, 'join', { role: 'creator' });

      logger.info('Collaboration session created', { sessionId, creatorId, contentType });
      return createdSession;
    } catch (error) {
      logger.error('Error creating collaboration session', { error, creatorId, contentType });
      throw error;
    }
  }

  /**
   * Invite users to collaborate
   */
  async inviteToCollaboration(
    sessionId: string,
    inviterId: string,
    invitees: { userId: string; role: 'editor' | 'viewer' | 'commenter' }[]
  ): Promise<CollaborationInvite[]> {
    try {
      const session = await this.getCollaborationSession(sessionId);
      if (!session) {
        throw new Error('Collaboration session not found');
      }

      if (session.creatorId !== inviterId && !session.permissions.canEdit.includes(inviterId)) {
        throw new Error('Insufficient permissions to invite users');
      }

      const invites: CollaborationInvite[] = [];
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      for (const invitee of invitees) {
        const inviteId = this.generateInviteId();
        const invite: CollaborationInvite = {
          inviteId,
          sessionId,
          inviterId,
          inviteeId: invitee.userId,
          role: invitee.role,
          status: 'pending',
          expiresAt,
          createdAt: new Date()
        };

        const createdInvite = await CollaborationInviteModel.create(invite);
        invites.push(createdInvite);

        // Add to timeline
        await this.addTimelineEvent(sessionId, inviterId, 'join', {
          action: 'invite_sent',
          inviteeId: invitee.userId,
          role: invitee.role
        });

        // Emit real-time notification
        io.to(`user:${invitee.userId}`).emit('collaboration_invite', {
          inviteId,
          sessionId,
          inviterId,
          role: invitee.role,
          content: session.content
        });
      }

      logger.info('Collaboration invites sent', { sessionId, inviteCount: invites.length });
      return invites;
    } catch (error) {
      logger.error('Error inviting to collaboration', { error, sessionId, inviterId });
      throw error;
    }
  }

  /**
   * Accept collaboration invite
   */
  async acceptInvite(inviteId: string, userId: string): Promise<CollaborationSession> {
    try {
      const invite = await CollaborationInviteModel.findOne({
        inviteId,
        inviteeId: userId,
        status: 'pending'
      });

      if (!invite) {
        throw new Error('Invite not found or expired');
      }

      if (invite.expiresAt < new Date()) {
        invite.status = 'expired';
        await invite.save();
        throw new Error('Invite has expired');
      }

      // Update invite status
      invite.status = 'accepted';
      await invite.save();

      // Add user to session
      const session = await this.getCollaborationSession(invite.sessionId);
      if (!session) {
        throw new Error('Collaboration session not found');
      }

      // Add user to participants and permissions
      if (!session.participants.includes(userId)) {
        session.participants.push(userId);
      }

      // Update permissions based on role
      switch (invite.role) {
        case 'editor':
          if (!session.permissions.canEdit.includes(userId)) {
            session.permissions.canEdit.push(userId);
          }
          if (!session.permissions.canComment.includes(userId)) {
            session.permissions.canComment.push(userId);
          }
          break;
        case 'commenter':
          if (!session.permissions.canComment.includes(userId)) {
            session.permissions.canComment.push(userId);
          }
          break;
        case 'viewer':
          // Viewers only get view permissions (default)
          break;
      }

      if (!session.permissions.canView.includes(userId)) {
        session.permissions.canView.push(userId);
      }

      session.updatedAt = new Date();
      await session.save();

      // Add to timeline
      await this.addTimelineEvent(invite.sessionId, userId, 'join', {
        role: invite.role,
        via: 'invite'
      });

      // Emit real-time update
      io.to(`collab:${invite.sessionId}`).emit('participant_joined', {
        userId,
        role: invite.role,
        sessionId: invite.sessionId
      });

      logger.info('Collaboration invite accepted', { inviteId, userId, sessionId: invite.sessionId });
      return session;
    } catch (error) {
      logger.error('Error accepting collaboration invite', { error, inviteId, userId });
      throw error;
    }
  }

  /**
   * Apply real-time edit
   */
  async applyRealTimeEdit(
    sessionId: string,
    userId: string,
    editType: 'text' | 'media' | 'metadata',
    changes: any
  ): Promise<RealTimeEdit> {
    try {
      const session = await this.getCollaborationSession(sessionId);
      if (!session) {
        throw new Error('Collaboration session not found');
      }

      if (!session.permissions.canEdit.includes(userId)) {
        throw new Error('Insufficient permissions to edit');
      }

      if (session.status !== 'active') {
        throw new Error('Session is not active');
      }

      const editId = this.generateEditId();
      const edit: RealTimeEdit = {
        editId,
        userId,
        sessionId,
        type: editType,
        changes,
        timestamp: new Date(),
        applied: false
      };

      // Apply changes to session content
      switch (editType) {
        case 'text':
          if (changes.title) session.content.title = changes.title;
          if (changes.description) session.content.description = changes.description;
          break;
        case 'media':
          if (changes.mediaUrl) session.content.mediaUrl = changes.mediaUrl;
          break;
        case 'metadata':
          session.content.metadata = { ...session.content.metadata, ...changes };
          break;
      }

      session.updatedAt = new Date();
      await session.save();

      // Save edit record
      const createdEdit = await RealTimeEditModel.create(edit);
      createdEdit.applied = true;
      await createdEdit.save();

      // Add to timeline
      await this.addTimelineEvent(sessionId, userId, 'edit', {
        editType,
        editId,
        changes
      });

      // Emit real-time update
      io.to(`collab:${sessionId}`).emit('content_updated', {
        editId,
        userId,
        editType,
        changes,
        timestamp: edit.timestamp
      });

      logger.info('Real-time edit applied', { sessionId, userId, editType, editId });
      return createdEdit;
    } catch (error) {
      logger.error('Error applying real-time edit', { error, sessionId, userId, editType });
      throw error;
    }
  }

  /**
   * Add comment to collaboration
   */
  async addComment(
    sessionId: string,
    userId: string,
    comment: string,
    timestamp?: number
  ): Promise<CollaborationEvent> {
    try {
      const session = await this.getCollaborationSession(sessionId);
      if (!session) {
        throw new Error('Collaboration session not found');
      }

      if (!session.permissions.canComment.includes(userId)) {
        throw new Error('Insufficient permissions to comment');
      }

      const event = await this.addTimelineEvent(sessionId, userId, 'comment', {
        comment,
        timestamp
      });

      // Emit real-time comment
      io.to(`collab:${sessionId}`).emit('comment_added', {
        eventId: event.eventId,
        userId,
        comment,
        timestamp: event.timestamp
      });

      logger.info('Comment added to collaboration', { sessionId, userId, eventId: event.eventId });
      return event;
    } catch (error) {
      logger.error('Error adding comment', { error, sessionId, userId });
      throw error;
    }
  }

  /**
   * Get collaboration session
   */
  async getCollaborationSession(sessionId: string): Promise<CollaborationSession | null> {
    try {
      // Try cache first
      const cached = await redisClient.get(`collab:session:${sessionId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const session = await CollaborationSessionModel.findOne({ sessionId });
      if (session) {
        // Cache for future requests
        await redisClient.setex(
          `collab:session:${sessionId}`,
          3600,
          JSON.stringify(session)
        );
      }

      return session;
    } catch (error) {
      logger.error('Error getting collaboration session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get user's collaboration sessions
   */
  async getUserCollaborations(userId: string): Promise<CollaborationSession[]> {
    try {
      const sessions = await CollaborationSessionModel.find({
        $or: [
          { creatorId: userId },
          { participants: userId }
        ],
        status: { $in: ['active', 'paused'] }
      }).sort({ updatedAt: -1 });

      return sessions;
    } catch (error) {
      logger.error('Error getting user collaborations', { error, userId });
      throw error;
    }
  }

  /**
   * Complete collaboration session
   */
  async completeCollaboration(sessionId: string, userId: string): Promise<CollaborationSession> {
    try {
      const session = await this.getCollaborationSession(sessionId);
      if (!session) {
        throw new Error('Collaboration session not found');
      }

      if (session.creatorId !== userId) {
        throw new Error('Only the creator can complete the session');
      }

      session.status = 'completed';
      session.updatedAt = new Date();
      await session.save();

      // Add to timeline
      await this.addTimelineEvent(sessionId, userId, 'approve', {
        action: 'session_completed'
      });

      // Emit completion event
      io.to(`collab:${sessionId}`).emit('collaboration_completed', {
        sessionId,
        completedBy: userId,
        finalContent: session.content
      });

      // Clear cache
      await redisClient.del(`collab:session:${sessionId}`);

      logger.info('Collaboration session completed', { sessionId, userId });
      return session;
    } catch (error) {
      logger.error('Error completing collaboration', { error, sessionId, userId });
      throw error;
    }
  }

  /**
   * Get collaboration analytics
   */
  async getCollaborationAnalytics(sessionId: string): Promise<any> {
    try {
      const session = await this.getCollaborationSession(sessionId);
      if (!session) {
        throw new Error('Collaboration session not found');
      }

      const edits = await RealTimeEditModel.find({ sessionId });
      const comments = session.timeline.filter(event => event.type === 'comment');

      const analytics = {
        sessionId,
        duration: Date.now() - session.createdAt.getTime(),
        participantCount: session.participants.length,
        editCount: edits.length,
        commentCount: comments.length,
        editTypes: edits.reduce((acc, edit) => {
          acc[edit.type] = (acc[edit.type] || 0) + 1;
          return acc;
        }, {} as any),
        participantActivity: session.participants.map(participant => {
          const participantEdits = edits.filter(edit => edit.userId === participant);
          const participantComments = comments.filter(comment => comment.userId === participant);
          return {
            userId: participant,
            editCount: participantEdits.length,
            commentCount: participantComments.length,
            lastActivity: participantEdits.length > 0 
              ? Math.max(...participantEdits.map(e => e.timestamp.getTime()))
              : participantComments.length > 0
                ? Math.max(...participantComments.map(c => c.timestamp.getTime()))
                : session.createdAt.getTime()
          };
        })
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting collaboration analytics', { error, sessionId });
      throw error;
    }
  }

  // Helper methods
  private async addTimelineEvent(
    sessionId: string,
    userId: string,
    type: 'edit' | 'comment' | 'approve' | 'reject' | 'join' | 'leave',
    data: any
  ): Promise<CollaborationEvent> {
    const event: CollaborationEvent = {
      eventId: this.generateEventId(),
      userId,
      type,
      timestamp: new Date(),
      data,
      version: 1
    };

    await CollaborationSessionModel.updateOne(
      { sessionId },
      { $push: { timeline: event }, $set: { updatedAt: new Date() } }
    );

    return event;
  }

  private generateSessionId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEditId(): string {
    return `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInviteId(): string {
    return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default CollaborativeContentService;
