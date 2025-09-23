import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  avatar: string;
  ogLevel: number;
  content: string;
  type: 'text' | 'gift' | 'system' | 'emoji';
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  metadata?: {
    giftId?: mongoose.Types.ObjectId;
    giftName?: string;
    giftAmount?: number;
    replyTo?: mongoose.Types.ObjectId;
    mentions?: string[];
    emoji?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'LiveStream',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    required: true
  },
  ogLevel: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'gift', 'system', 'emoji'],
    default: 'text'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  metadata: {
    giftId: { type: Schema.Types.ObjectId, ref: 'Gift' },
    giftName: String,
    giftAmount: Number,
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    mentions: [String],
    emoji: String
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ roomId: 1, createdAt: 1 });
messageSchema.index({ userId: 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ createdAt: -1 });

// Pre-save middleware to process content
messageSchema.pre('save', function(next) {
  if (this.isModified('content') && this.type === 'text') {
    // Extract mentions
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(this.content)) !== null) {
      mentions.push(match[1]);
    }
    this.metadata = { ...this.metadata, mentions };
  }
  next();
});

// Method to soft delete message
messageSchema.methods.softDelete = function(deletedBy: string): void {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.content = '[Message deleted]';
};

// Static method to find messages by room
messageSchema.statics.findByRoom = function(roomId: string, limit: number = 50, skip: number = 0) {
  return this.find({
    roomId,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'username avatar ogLevel')
    .populate('replyTo', 'content username');
};

// Static method to find user messages
messageSchema.statics.findByUser = function(userId: string, limit: number = 20) {
  return this.find({
    userId,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('roomId', 'title thumbnail');
};

// Static method to find messages with mentions
messageSchema.statics.findWithMentions = function(username: string, limit: number = 20) {
  return this.find({
    'metadata.mentions': username,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar ogLevel')
    .populate('roomId', 'title thumbnail');
};

// Static method to find gift messages
messageSchema.statics.findGiftMessages = function(roomId: string, limit: number = 20) {
  return this.find({
    roomId,
    type: 'gift',
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar ogLevel')
    .populate('metadata.giftId', 'name icon');
};

// Critical indexes for chat performance
// Chat message loading - HIGH PRIORITY
messageSchema.index({ roomId: 1, createdAt: -1 });

// Moderation queries
messageSchema.index({ userId: 1, createdAt: -1 });

// Pinned messages
messageSchema.index({ roomId: 1, pinned: 1 }, { sparse: true });

// Gift messages
messageSchema.index({ roomId: 1, type: 1, createdAt: -1 });

// Mentions lookup
messageSchema.index({ 'metadata.mentions': 1 }, { sparse: true });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
