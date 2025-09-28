import mongoose, { Document, Schema } from 'mongoose';

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const followSchema = new Schema<IFollow>({
  follower: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate follows and improve query performance
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Indexes for efficient queries
followSchema.index({ follower: 1, createdAt: -1 }); // Get following list
followSchema.index({ following: 1, createdAt: -1 }); // Get followers list
followSchema.index({ following: 1 }); // Count followers

// Static method to check if user A follows user B
followSchema.statics.isFollowing = function(followerId: string, followingId: string) {
  return this.findOne({ follower: followerId, following: followingId });
};

// Static method to get followers count
followSchema.statics.getFollowersCount = function(userId: string) {
  return this.countDocuments({ following: userId });
};

// Static method to get following count
followSchema.statics.getFollowingCount = function(userId: string) {
  return this.countDocuments({ follower: userId });
};

// Static method to get mutual follows
followSchema.statics.getMutualFollows = function(userId1: string, userId2: string) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { follower: new mongoose.Types.ObjectId(userId1) },
          { follower: new mongoose.Types.ObjectId(userId2) }
        ]
      }
    },
    {
      $group: {
        _id: '$following',
        followers: { $push: '$follower' }
      }
    },
    {
      $match: {
        $expr: {
          $and: [
            { $in: [new mongoose.Types.ObjectId(userId1), '$followers'] },
            { $in: [new mongoose.Types.ObjectId(userId2), '$followers'] }
          ]
        }
      }
    }
  ]);
};

export const Follow = mongoose.model<IFollow>('Follow', followSchema);