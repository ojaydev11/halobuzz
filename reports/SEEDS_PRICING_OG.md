# Seeds, Pricing & OG System

## Executive Summary
- **Seed Scripts**: ✅ **Comprehensive** with 5 major data categories
- **OG Tiers**: ✅ **5 tiers** with progressive benefits and daily rewards
- **Pricing**: ✅ **Multi-country** support for 5 South Asian countries
- **Gifts**: ✅ **30 gifts** across 5 categories with festival integration
- **Formula**: ✅ **NPR 10 = 500 coins** with proper exchange rates
- **Missing**: Dynamic pricing, A/B testing, advanced analytics

## Seed Scripts Overview

### 📊 **Seed Inventory** (`backend/scripts/seeds/`)
**Status**: ✅ **Fully Implemented**
**Total Scripts**: 5 comprehensive seed files
**Documentation**: Complete README with usage instructions

**Available Seeds**:
1. **OG Tiers** (`og-tiers.ts`) - 5 membership tiers
2. **Gifts** (`gifts.ts`) - 30 virtual gifts
3. **Festivals** (`festivals.ts`) - 12 cultural festivals
4. **Pricing** (`pricing.ts`) - 5 country configurations
5. **Games** (`games.ts`) - 10 casual games

## OG Tiers System

### 🌟 **OG Tier Structure** (`og-tiers.ts`)
**Status**: ✅ **Fully Implemented**
**Size**: 186 lines
**Total Tiers**: 5 progressive membership levels

### **Tier Breakdown**:

#### **Tier 1: Fresh OG**
- **Price**: 5,000 coins
- **Duration**: 15 days
- **Daily Reward**: 200 coins (60% rebate)
- **Perks**: upcoming_hosts, custom_bubble, ai_gift_hint

#### **Tier 2: Skilled OG**
- **Price**: 7,000 coins
- **Duration**: 25 days
- **Daily Reward**: 168 coins (60% rebate)
- **Perks**: viewer_insights, early_join, viewer_mirror, animated_reacts

#### **Tier 3: Elite OG**
- **Price**: 9,000 coins
- **Duration**: 30 days
- **Daily Reward**: 180 coins (60% rebate)
- **Perks**: auto_gifter_one, stealth_entry, pin_one_message, mic_priority

#### **Tier 4: Crown OG**
- **Price**: 15,000 coins
- **Duration**: 60 days
- **Daily Reward**: 150 coins (60% rebate)
- **Perks**: buzz_entry, ai_cohost, og_lounge, profile_anim, unsend

#### **Tier 5: Immortal OG**
- **Price**: 45,000 coins
- **Duration**: 180 days
- **Daily Reward**: 150 coins (60% rebate)
- **Perks**: ghost_mode, monthly_vote, whale_radar, premium_reel_week, sidekick, unsend, og_spotlight

### **OG Business Logic**:
- **Rebate Formula**: `floor(priceCoins * 0.6 / durationDays)`
- **Progressive Benefits**: Each tier includes all lower tier perks
- **Daily Rewards**: Automatically calculated and distributed via cron job
- **Duration Range**: 15-180 days for different commitment levels

## Pricing System

### 💰 **Multi-Country Pricing** (`pricing.ts`)
**Status**: ✅ **Fully Implemented**
**Size**: 576 lines
**Countries**: 5 South Asian countries
**Exchange Rate**: NPR 10 = 500 coins (base rate)

### **Country Configurations**:

#### **Nepal (NP) - NPR**
- **Base Rate**: 10 NPR per 500 coins
- **Tax Rate**: 13%
- **Packages**: 6 tiers (500-25,000 coins)
- **Gateways**: eSewa, Khalti, Connect IPS, Stripe
- **Popular Package**: 1,000 coins for 18 NPR (50 bonus)

#### **India (IN) - INR**
- **Base Rate**: 50 INR per 500 coins
- **Tax Rate**: 18%
- **Packages**: 5 tiers (500-10,000 coins)
- **Gateways**: Razorpay, Paytm, Stripe
- **Popular Package**: 1,000 coins for 90 INR (100 bonus)

#### **Bangladesh (BD) - BDT**
- **Base Rate**: 100 BDT per 500 coins
- **Tax Rate**: 15%
- **Packages**: 4 tiers (500-5,000 coins)
- **Gateways**: bKash, Nagad, Stripe
- **Popular Package**: 1,000 coins for 180 BDT (100 bonus)

#### **Pakistan (PK) - PKR**
- **Base Rate**: 200 PKR per 500 coins
- **Tax Rate**: 17%
- **Packages**: 4 tiers (500-5,000 coins)
- **Gateways**: EasyPaisa, Jazz Cash, Stripe
- **Popular Package**: 1,000 coins for 360 PKR (100 bonus)

#### **Sri Lanka (LK) - LKR**
- **Base Rate**: 50 LKR per 500 coins
- **Tax Rate**: 15%
- **Packages**: 4 tiers (500-5,000 coins)
- **Gateways**: Dialog Pay, Mobitel Pay, Stripe
- **Popular Package**: 1,000 coins for 90 LKR (100 bonus)

### **Pricing Features**:
- **Gateway Fees**: 1.5-2.9% per transaction
- **Bonus Structure**: Higher packages include bonus coins
- **Tax Calculation**: Built-in tax rate handling
- **Popular Packages**: Marked for UI highlighting
- **Min/Max Limits**: Gateway-specific transaction limits

## Gift System

### 🎁 **Gift Inventory** (`gifts.ts`)
**Status**: ✅ **Fully Implemented**
**Size**: 518 lines
**Total Gifts**: 30 items across 5 categories
**Price Range**: 30-1,200 coins

### **Gift Categories**:

#### **Flower Category (8 items)**
- Red Rose (50 coins) - Common
- Pink Rose (75 coins) - Common
- Sunflower (100 coins) - Rare
- Sacred Lotus (150 coins) - Epic
- Marigold (80 coins) - Common
- Jasmine (120 coins) - Rare
- Orchid (200 coins) - Epic
- Golden Rose (500 coins) - Legendary

#### **Emoji Category (7 items)**
- Red Heart (30 coins) - Common
- Sparkling Heart (60 coins) - Rare
- Fire (80 coins) - Rare
- Star (100 coins) - Epic
- Crown (300 coins) - Legendary
- Diamond (400 coins) - Legendary
- Rainbow (150 coins) - Epic

#### **Sticker Category (6 items)**
- Cute Cat (40 coins) - Common
- Happy Dog (50 coins) - Common
- Sleeping Panda (90 coins) - Rare
- Unicorn (180 coins) - Epic
- Dragon (250 coins) - Legendary
- Butterfly (70 coins) - Common

#### **Super Category (4 items)**
- Super Rocket (1,000 coins) - Legendary
- Laser Show (800 coins) - Epic
- Fireworks (600 coins) - Epic
- Meteor Shower (1,200 coins) - Legendary

#### **Festival Category (5 items)**
- Dashain Tika (200 coins) - Epic
- Tihar Diyo (150 coins) - Rare
- Holi Colors (180 coins) - Epic
- Lhosar Prayer Flag (120 coins) - Rare
- Christmas Tree (300 coins) - Epic

### **Gift Features**:
- **Lottie Animations**: Each gift has animation URL
- **Festival Integration**: 5 festival-specific gifts
- **Rarity System**: Common → Rare → Epic → Legendary
- **Cultural Relevance**: Nepali and global festival themes
- **Price Scaling**: Rarity-based pricing structure

## Festival System

### 🎉 **Festival Integration** (`festivals.ts`)
**Status**: ✅ **Fully Implemented**
**Total Festivals**: 12 major celebrations
**Categories**: Nepali, Indian, Global festivals

### **Festival Types**:
- **Nepali Festivals**: Dashain, Tihar, Lhosar
- **Indian Festivals**: Holi, Diwali, Eid
- **Global Festivals**: Christmas, New Year, Valentine's Day
- **Seasonal Events**: Spring, Summer, Monsoon themes

### **Festival Features**:
- **Date Management**: Start/end date ranges
- **Gift Sets**: Festival-specific gift collections
- **UI Skins**: Festival theme URLs
- **Cultural Context**: Descriptions and rules
- **Automatic Activation**: Cron job-based festival activation

## Business Logic Validation

### ✅ **Correct Implementation**
- **OG Formula**: `floor(priceCoins * 0.6 / durationDays)` ✅
- **Exchange Rate**: NPR 10 = 500 coins ✅
- **Tax Calculation**: Country-specific tax rates ✅
- **Bonus Structure**: Higher packages include bonuses ✅
- **Gateway Fees**: Percentage + fixed fee structure ✅

### ✅ **Data Consistency**
- **OG Tiers**: Progressive pricing and benefits ✅
- **Gift Pricing**: Rarity-based price scaling ✅
- **Country Pricing**: Consistent exchange rate logic ✅
- **Festival Gifts**: Proper festival integration ✅

## Database Schema

### **OG Tier Schema**
```typescript
{
  tier: number (1-5, unique),
  name: string (unique),
  priceCoins: number (min: 0),
  durationDays: number (min: 1),
  rebatePct: number (0-1, default: 0.6),
  perks: string[],
  dailyReward: number (calculated),
  active: boolean (default: true)
}
```

### **Pricing Schema**
```typescript
{
  country: string (NP|IN|BD|PK|LK, unique),
  currency: string,
  coinPackages: [{
    coins: number,
    price: number,
    bonus: number,
    popular: boolean
  }],
  exchangeRate: { NPR_per_500_coins: number },
  gateways: [{
    name: string,
    enabled: boolean,
    minAmount: number,
    maxAmount: number,
    fees: { percentage: number, fixed: number }
  }],
  taxRate: number (0-100),
  active: boolean
}
```

### **Gift Schema**
```typescript
{
  code: string (unique),
  name: string,
  priceCoins: number (min: 0),
  rarity: 'common'|'rare'|'epic'|'legendary',
  category: 'flower'|'emoji'|'sticker'|'super'|'festival',
  animation: { lottieUrl: string },
  active: boolean,
  isFestivalGift: boolean,
  description: string
}
```

## Usage Examples

### **Running Seeds**
```bash
# Run all seeds
npm run seed

# Run specific seed
npm run seed -- og-tiers
npm run seed -- pricing
npm run seed -- gifts

# Run individual files
npx ts-node scripts/seeds/og-tiers.ts
npx ts-node scripts/seeds/pricing.ts
```

### **OG Tier Usage**
```typescript
// Get OG tier by level
const tier = await OGTier.findOne({ tier: 3 });

// Calculate daily reward
const dailyReward = Math.floor(tier.priceCoins * tier.rebatePct / tier.durationDays);

// Check user OG benefits
const userOG = await User.findById(userId).select('ogLevel ogExpiresAt');
```

### **Pricing Usage**
```typescript
// Get pricing for country
const pricing = await Pricing.findOne({ country: 'NP' });

// Calculate total price with tax and fees
const totalPrice = pricing.calculateTotalPrice(packageIndex, 'esewa');

// Get popular packages
const popularPkgs = pricing.popularPackages;
```

## Missing Features

### ❌ **Dynamic Pricing**
**Impact**: Medium - No real-time price adjustments
**Missing**:
- Market-based pricing
- Demand-based adjustments
- Seasonal pricing
- Promotional pricing

### ❌ **A/B Testing**
**Impact**: Medium - No pricing experimentation
**Missing**:
- Price point testing
- Package structure testing
- Gateway preference testing
- Conversion optimization

### ❌ **Advanced Analytics**
**Impact**: Low - Limited pricing insights
**Missing**:
- Revenue analytics
- Conversion tracking
- Price elasticity analysis
- Customer lifetime value

### ❌ **Regional Customization**
**Impact**: Low - Limited localization
**Missing**:
- Currency-specific promotions
- Local payment preferences
- Cultural pricing adjustments
- Regional gift preferences

## Performance Considerations

### ✅ **Optimized**
- Database indexing on key fields
- Efficient seed execution
- Proper schema design
- Cached pricing calculations

### ⚠️ **Could Be Improved**
- Real-time price updates
- Cached gift catalogs
- Optimized OG tier lookups
- Festival activation performance

## Integration Points

### ✅ **Well Integrated**
- Cron job for OG daily rewards
- Festival activation system
- Payment gateway integration
- Gift system integration

### ⚠️ **Needs Integration**
- Real-time price updates
- Dynamic gift availability
- A/B testing framework
- Analytics dashboard

## Next Steps

### **High Priority**
1. Implement dynamic pricing system
2. Add A/B testing for pricing
3. Create pricing analytics dashboard
4. Implement real-time price updates

### **Medium Priority**
1. Add regional customization
2. Implement promotional pricing
3. Create gift recommendation system
4. Add festival gift rotation

### **Low Priority**
1. Implement advanced analytics
2. Add price elasticity analysis
3. Create customer segmentation
4. Implement loyalty pricing
