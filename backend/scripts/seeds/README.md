# HaloBuzz Database Seed Scripts

This directory contains comprehensive seed scripts for populating the HaloBuzz database with initial data for development and testing.

## 📋 Available Seeds

### 1. OG Tiers (`og-tiers.ts`)
- **Purpose**: Creates 5 OG membership tiers with different benefits
- **Data**: 5 tiers (Bronze to Diamond) with pricing, perks, and daily rewards
- **Key Features**:
  - Tier-based pricing (500-10,000 coins)
  - Daily reward calculation: `floor(priceCoins * rebatePct / durationDays)`
  - Default rebate percentage: 60%
  - Progressive perks system

### 2. Gifts (`gifts.ts`)
- **Purpose**: Populates gift system with 30+ items across categories
- **Data**: 30 gifts across 5 categories (flower, emoji, sticker, super, festival)
- **Key Features**:
  - 5 festival gifts with `isFestivalGift: true`
  - Rarity levels: common, rare, epic, legendary
  - Lottie animation URLs for each gift
  - Price range: 30-1,200 coins

### 3. Festivals (`festivals.ts`)
- **Purpose**: Creates major Nepali and global festivals
- **Data**: 12 festivals including Dashain, Tihar, Holi, Lhosar, Eid, Christmas, New Year
- **Key Features**:
  - Country-specific and global festivals
  - Date ranges with start/end dates
  - Gift set IDs and UI skin URLs
  - Festival rules and descriptions

### 4. Pricing (`pricing.ts`)
- **Purpose**: Sets up coin pricing and payment gateway configurations
- **Data**: 5 countries (NP, IN, BD, PK, LK) with complete pricing
- **Key Features**:
  - Country-specific coin packages
  - Exchange rates (e.g., NP: 10 NPR per 500 coins)
  - Payment gateway configurations with fees
  - Tax rates and bonus structures

### 5. Games (`games.ts`)
- **Purpose**: Creates 10 casual games for the gaming system
- **Data**: 10 games with varying entry costs and AI win rates
- **Key Features**:
  - AI win rate range: 35-55% (configurable)
  - Entry costs: 10-60 coins
  - Payout tables with rank-based rewards
  - Game categories: luck, skill, strategy, puzzle

## 🚀 Usage

### Run All Seeds
```bash
npm run seed
```

### Run Specific Seed
```bash
npm run seed -- og-tiers
npm run seed -- gifts
npm run seed -- festivals
npm run seed -- pricing
npm run seed -- games
```

### Run Individual Seed Files
```bash
npx ts-node scripts/seeds/og-tiers.ts
npx ts-node scripts/seeds/gifts.ts
npx ts-node scripts/seeds/festivals.ts
npx ts-node scripts/seeds/pricing.ts
npx ts-node scripts/seeds/games.ts
```

### Get Help
```bash
npm run seed -- --help
```

## 📊 Data Summary

| Collection | Count | Description |
|------------|-------|-------------|
| OGTier | 5 | OG membership tiers |
| Gift | 30 | Virtual gifts |
| Festival | 12 | Cultural festivals |
| Pricing | 5 | Country pricing configs |
| Game | 10 | Casual games |

## 🔧 Configuration

### Environment Variables
Make sure your `.env` file contains:
```env
MONGODB_URI=mongodb://localhost:27017/halobuzz
```

### Database Connection
All seeds automatically connect to MongoDB using the `MONGODB_URI` environment variable or default to `mongodb://localhost:27017/halobuzz`.

## 📈 Features

### OG Tiers
- **Daily Rewards**: Automatically calculated based on price and duration
- **Progressive Perks**: Each tier includes all lower tier benefits
- **Flexible Pricing**: Easy to modify coin costs and durations

### Gifts
- **Category System**: Organized by type (flower, emoji, etc.)
- **Festival Integration**: Special gifts for festival periods
- **Rarity System**: Common to legendary with price scaling

### Festivals
- **Date Management**: Automatic calculation of upcoming festivals
- **Country Support**: NP-specific and global festivals
- **UI Integration**: Skin URLs for festival themes

### Pricing
- **Multi-Country**: Support for 5 South Asian countries
- **Gateway Integration**: Payment processor configurations
- **Tax Calculation**: Built-in tax rate handling

### Games
- **AI Balancing**: Configurable win rates for fair gameplay
- **Payout Tables**: Rank-based reward systems
- **Category Classification**: Luck vs skill-based games

## 🛠️ Customization

### Adding New Data
1. Edit the respective seed file
2. Add new entries to the data array
3. Run the specific seed: `npm run seed -- <seed-name>`

### Modifying Existing Data
1. Update the data arrays in seed files
2. Run seeds to replace existing data
3. Seeds automatically clear existing data before inserting

### Schema Changes
If you modify the database schemas, update the corresponding seed files to match the new structure.

## 🔍 Monitoring

### Seed Execution Logs
Each seed provides detailed logging:
- Connection status
- Data insertion progress
- Statistics and summaries
- Error reporting

### Performance Metrics
- Execution time per seed
- Total seeding duration
- Success/failure rates
- Data validation results

## 🚨 Error Handling

### Common Issues
1. **MongoDB Connection**: Ensure MongoDB is running
2. **Environment Variables**: Check `.env` file configuration
3. **Schema Mismatch**: Verify seed data matches current schemas
4. **Duplicate Keys**: Seeds automatically handle existing data

### Troubleshooting
- Check MongoDB connection string
- Verify database permissions
- Review seed file syntax
- Check for duplicate unique constraints

## 📝 Development Notes

### Adding New Seeds
1. Create new seed file in `scripts/seeds/`
2. Export seed function and model
3. Add to `index.ts` seed functions array
4. Update this README

### Best Practices
- Use TypeScript interfaces for data validation
- Include comprehensive error handling
- Add detailed logging and statistics
- Maintain data consistency across seeds
- Use meaningful default values

### Testing Seeds
- Test individual seeds first
- Verify data integrity after seeding
- Check foreign key relationships
- Validate business logic constraints
