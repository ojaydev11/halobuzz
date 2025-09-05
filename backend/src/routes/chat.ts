import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { moderationQueue } from '../services/ModerationQueue';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Get messages for a stream
router.get('/:streamId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { streamId } = req.params;
    const { limit = 50, page = 1, type } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    let messages;
    if (type === 'gift') {
      messages = await Message.find({ roomId: streamId, type: 'gift', isDeleted: false }).sort({ createdAt: -1 }).limit(parseInt(limit as string));
    } else {
      messages = await Message.find({ roomId: streamId, isDeleted: false }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit as string));
    }

    const total = await Message.countDocuments({ 
      roomId: streamId, 
      isDeleted: false,
      ...(type && { type })
    });

    res.json({
      success: true,
      data: {
        messages: messages.map(message => ({
          id: message._id,
          userId: message.userId,
          username: message.username,
          avatar: message.avatar,
          ogLevel: message.ogLevel,
          content: message.content,
          type: message.type,
          metadata: message.metadata,
          createdAt: message.createdAt
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get messages failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

// Send message
router.post('/:streamId/send', [
  body('content')
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be 1-500 characters'),
  body('type')
    .optional()
    .isIn(['text', 'emoji'])
    .withMessage('Valid message type is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { streamId } = req.params;
    const { content, type = 'text', replyTo } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate stream
    const stream = await LiveStream.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found'
      });
    }

    if (stream.status !== 'live') {
      return res.status(400).json({
        success: false,
        error: 'Stream is not live'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: 'User is banned'
      });
    }

    // Auto-moderation check
    const moderationResult = await moderationQueue.autoModerateContent(content);
    if (moderationResult.isFlagged) {
      return res.status(400).json({
        success: false,
        error: 'Message contains inappropriate content'
      });
    }

    // Create message
    const message = new Message({
      roomId: streamId,
      userId,
      username: user.username,
      avatar: user.avatar,
      ogLevel: user.ogLevel,
      content,
      type,
      metadata: {
        replyTo,
        mentions: extractMentions(content)
      }
    });

    await message.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: {
          id: message._id,
          userId: message.userId,
          username: message.username,
          avatar: message.avatar,
          ogLevel: message.ogLevel,
          content: message.content,
          type: message.type,
          metadata: message.metadata,
          createdAt: message.createdAt
        }
      }
    });

  } catch (error) {
    logger.error('Send message failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// Delete message (OG4/5 privilege)
router.delete('/:messageId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check OG privilege (OG4/5 can delete messages)
    if (user.ogLevel < 4) {
      return res.status(403).json({
        success: false,
        error: 'OG Tier 4+ required to delete messages'
      });
    }

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if user is message author or has higher OG level
    if (message.userId.toString() !== userId && user.ogLevel <= message.ogLevel) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete message from user with same or higher OG level'
      });
    }

    // Soft delete message
    (message as any).softDelete(userId);
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    logger.error('Delete message failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// Get messages with mentions
router.get('/mentions/:username', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username } = req.params;
    const { limit = 20 } = req.query;

    const messages = await Message.find({ 'metadata.mentions': username, isDeleted: false }).sort({ createdAt: -1 }).limit(parseInt(limit as string));

    res.json({
      success: true,
      data: {
        messages: messages.map(message => ({
          id: message._id,
          userId: message.userId,
          username: message.username,
          avatar: message.avatar,
          ogLevel: message.ogLevel,
          content: message.content,
          type: message.type,
          roomId: message.roomId,
          createdAt: message.createdAt
        }))
      }
    });

  } catch (error) {
    logger.error('Get mentions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mentions'
    });
  }
});

// Pin message (OG4/5 privilege)
router.post('/:messageId/pin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check OG privilege (OG4/5 can pin messages)
    if (user.ogLevel < 4) {
      return res.status(403).json({
        success: false,
        error: 'OG Tier 4+ required to pin messages'
      });
    }

    // Find message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // TODO: Implement message pinning logic
    // This would involve updating the message or creating a pinned message record

    res.json({
      success: true,
      message: 'Message pinned successfully'
    });

  } catch (error) {
    logger.error('Pin message failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pin message'
    });
  }
});

// Get chat statistics
router.get('/:streamId/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { streamId } = req.params;

    const [totalMessages, giftMessages, uniqueUsers] = await Promise.all([
      Message.countDocuments({ roomId: streamId, isDeleted: false }),
      Message.countDocuments({ roomId: streamId, type: 'gift', isDeleted: false }),
      Message.distinct('userId', { roomId: streamId, isDeleted: false })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalMessages,
          giftMessages,
          uniqueUsers: uniqueUsers.length,
          textMessages: totalMessages - giftMessages
        }
      }
    });

  } catch (error) {
    logger.error('Get chat stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat statistics'
    });
  }
});

// Helper function to extract mentions from content
function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

export default router;
