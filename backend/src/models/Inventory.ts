/**
 * Inventory Model
 * Stores user's virtual items, cosmetics, and collectibles
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  userId: mongoose.Types.ObjectId;
  items: Map<string, InventoryItem>;
  cosmetics: Map<string, CosmeticItem>;
  collectibles: Map<string, CollectibleItem>;
  lastUpdated: Date;
  version: number;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
  acquiredAt: Date;
  source: 'purchase' | 'reward' | 'gift' | 'achievement' | 'event';
  metadata?: any;
}

export interface CosmeticItem {
  cosmeticId: string;
  name: string;
  type: 'avatar' | 'frame' | 'badge' | 'emote' | 'theme';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  equipped: boolean;
  acquiredAt: Date;
  expiresAt?: Date;
}

export interface CollectibleItem {
  collectibleId: string;
  name: string;
  series: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  quantity: number;
  acquiredAt: Date;
  metadata?: any;
}

const InventoryItemSchema = new Schema({
  itemId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  acquiredAt: { type: Date, required: true },
  source: { 
    type: String, 
    required: true,
    enum: ['purchase', 'reward', 'gift', 'achievement', 'event']
  },
  metadata: { type: Schema.Types.Mixed }
}, { _id: false });

const CosmeticItemSchema = new Schema({
  cosmeticId: { type: String, required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['avatar', 'frame', 'badge', 'emote', 'theme']
  },
  rarity: { 
    type: String, 
    required: true,
    enum: ['common', 'rare', 'epic', 'legendary']
  },
  equipped: { type: Boolean, default: false },
  acquiredAt: { type: Date, required: true },
  expiresAt: { type: Date }
}, { _id: false });

const CollectibleItemSchema = new Schema({
  collectibleId: { type: String, required: true },
  name: { type: String, required: true },
  series: { type: String, required: true },
  rarity: { 
    type: String, 
    required: true,
    enum: ['common', 'rare', 'epic', 'legendary', 'mythic']
  },
  quantity: { type: Number, required: true, min: 0 },
  acquiredAt: { type: Date, required: true },
  metadata: { type: Schema.Types.Mixed }
}, { _id: false });

const InventorySchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  items: { 
    type: Map, 
    of: InventoryItemSchema,
    default: new Map()
  },
  cosmetics: { 
    type: Map, 
    of: CosmeticItemSchema,
    default: new Map()
  },
  collectibles: { 
    type: Map, 
    of: CollectibleItemSchema,
    default: new Map()
  },
  lastUpdated: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
}, {
  timestamps: true,
  collection: 'inventories'
});

// Indexes for performance
InventorySchema.index({ userId: 1 });
InventorySchema.index({ 'items.itemId': 1 });
InventorySchema.index({ 'cosmetics.cosmeticId': 1 });
InventorySchema.index({ 'collectibles.collectibleId': 1 });
InventorySchema.index({ lastUpdated: 1 });

// Pre-save hook to update version and timestamp
InventorySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  this.version += 1;
  next();
});

export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);
