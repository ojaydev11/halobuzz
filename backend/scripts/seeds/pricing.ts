import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

interface PricingConfig {
  country: string;
  currency: string;
  coinPackages: Array<{
    coins: number;
    price: number;
    bonus?: number;
    popular?: boolean;
  }>;
  exchangeRate: {
    NPR_per_500_coins: number;
  };
  gateways: Array<{
    name: string;
    enabled: boolean;
    minAmount?: number;
    maxAmount?: number;
    fees?: {
      percentage: number;
      fixed: number;
    };
  }>;
  taxRate: number;
  active: boolean;
}

const pricingConfigs: PricingConfig[] = [
  {
    country: 'NP',
    currency: 'NPR',
    coinPackages: [
      {
        coins: 500,
        price: 10,
        bonus: 0,
        popular: false
      },
      {
        coins: 1000,
        price: 18,
        bonus: 50,
        popular: true
      },
      {
        coins: 2500,
        price: 40,
        bonus: 200,
        popular: false
      },
      {
        coins: 5000,
        price: 75,
        bonus: 500,
        popular: false
      },
      {
        coins: 10000,
        price: 140,
        bonus: 1200,
        popular: false
      },
      {
        coins: 25000,
        price: 320,
        bonus: 3500,
        popular: false
      }
    ],
    exchangeRate: {
      NPR_per_500_coins: 10
    },
    gateways: [
      {
        name: 'esewa',
        enabled: true,
        minAmount: 10,
        maxAmount: 10000,
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      },
      {
        name: 'khalti',
        enabled: true,
        minAmount: 10,
        maxAmount: 10000,
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      },
      {
        name: 'connect_ips',
        enabled: true,
        minAmount: 10,
        maxAmount: 10000,
        fees: {
          percentage: 1.0,
          fixed: 0
        }
      },
      {
        name: 'stripe',
        enabled: true,
        minAmount: 10,
        maxAmount: 10000,
        fees: {
          percentage: 2.9,
          fixed: 0
        }
      }
    ],
    taxRate: 13.0,
    active: true
  },
  {
    country: 'IN',
    currency: 'INR',
    coinPackages: [
      {
        coins: 500,
        price: 50,
        bonus: 0,
        popular: false
      },
      {
        coins: 1000,
        price: 90,
        bonus: 100,
        popular: true
      },
      {
        coins: 2500,
        price: 200,
        bonus: 300,
        popular: false
      },
      {
        coins: 5000,
        price: 375,
        bonus: 750,
        popular: false
      },
      {
        coins: 10000,
        price: 700,
        bonus: 1500,
        popular: false
      }
    ],
    exchangeRate: {
      NPR_per_500_coins: 50
    },
    gateways: [
      {
        name: 'razorpay',
        enabled: true,
        minAmount: 50,
        maxAmount: 10000,
        fees: {
          percentage: 2.0,
          fixed: 0
        }
      },
      {
        name: 'paytm',
        enabled: true,
        minAmount: 50,
        maxAmount: 10000,
        fees: {
          percentage: 2.0,
          fixed: 0
        }
      },
      {
        name: 'stripe',
        enabled: true,
        minAmount: 50,
        maxAmount: 10000,
        fees: {
          percentage: 2.9,
          fixed: 0
        }
      }
    ],
    taxRate: 18.0,
    active: true
  },
  {
    country: 'BD',
    currency: 'BDT',
    coinPackages: [
      {
        coins: 500,
        price: 100,
        bonus: 0,
        popular: false
      },
      {
        coins: 1000,
        price: 180,
        bonus: 100,
        popular: true
      },
      {
        coins: 2500,
        price: 400,
        bonus: 300,
        popular: false
      },
      {
        coins: 5000,
        price: 750,
        bonus: 750,
        popular: false
      }
    ],
    exchangeRate: {
      NPR_per_500_coins: 100
    },
    gateways: [
      {
        name: 'bkash',
        enabled: true,
        minAmount: 100,
        maxAmount: 25000,
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      },
      {
        name: 'nagad',
        enabled: true,
        minAmount: 100,
        maxAmount: 25000,
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      },
      {
        name: 'stripe',
        enabled: true,
        minAmount: 100,
        maxAmount: 25000,
        fees: {
          percentage: 2.9,
          fixed: 0
        }
      }
    ],
    taxRate: 15.0,
    active: true
  },
  {
    country: 'PK',
    currency: 'PKR',
    coinPackages: [
      {
        coins: 500,
        price: 200,
        bonus: 0,
        popular: false
      },
      {
        coins: 1000,
        price: 360,
        bonus: 100,
        popular: true
      },
      {
        coins: 2500,
        price: 800,
        bonus: 300,
        popular: false
      },
      {
        coins: 5000,
        price: 1500,
        bonus: 750,
        popular: false
      }
    ],
    exchangeRate: {
      NPR_per_500_coins: 200
    },
    gateways: [
      {
        name: 'easypaisa',
        enabled: true,
        minAmount: 200,
        maxAmount: 50000,
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      },
      {
        name: 'jazz_cash',
        enabled: true,
        minAmount: 200,
        maxAmount: 50000,
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      },
      {
        name: 'stripe',
        enabled: true,
        minAmount: 200,
        maxAmount: 50000,
        fees: {
          percentage: 2.9,
          fixed: 0
        }
      }
    ],
    taxRate: 17.0,
    active: true
  },
  {
    country: 'LK',
    currency: 'LKR',
    coinPackages: [
      {
        coins: 500,
        price: 50,
        bonus: 0,
        popular: false
      },
      {
        coins: 1000,
        price: 90,
        bonus: 100,
        popular: true
      },
      {
        coins: 2500,
        price: 200,
        bonus: 300,
        popular: false
      },
      {
        coins: 5000,
        price: 375,
        bonus: 750,
        popular: false
      }
    ],
    exchangeRate: {
      NPR_per_500_coins: 50
    },
    gateways: [
      {
        name: 'dialog_pay',
        enabled: true,
        minAmount: 50,
        maxAmount: 10000,
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      },
      {
        name: 'mobitel_pay',
        enabled: true,
        minAmount: 50,
        maxAmount: 10000,
        fees: {
          percentage: 1.5,
          fixed: 0
        }
      },
      {
        name: 'stripe',
        enabled: true,
        minAmount: 50,
        maxAmount: 10000,
        fees: {
          percentage: 2.9,
          fixed: 0
        }
      }
    ],
    taxRate: 15.0,
    active: true
  }
];

// Create Pricing schema
const pricingSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true,
    unique: true,
    enum: ['NP', 'IN', 'BD', 'PK', 'LK']
  },
  currency: {
    type: String,
    required: true,
    trim: true
  },
  coinPackages: [{
    coins: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    bonus: {
      type: Number,
      default: 0,
      min: 0
    },
    popular: {
      type: Boolean,
      default: false
    }
  }],
  exchangeRate: {
    NPR_per_500_coins: {
      type: Number,
      required: true,
      min: 0
    }
  },
  gateways: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    minAmount: {
      type: Number,
      min: 0
    },
    maxAmount: {
      type: Number,
      min: 0
    },
    fees: {
      percentage: {
        type: Number,
        default: 0,
        min: 0
      },
      fixed: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  }],
  taxRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
pricingSchema.index({ country: 1 }, { unique: true });
pricingSchema.index({ active: 1 });
pricingSchema.index({ currency: 1 });

// Virtual for getting popular packages
pricingSchema.virtual('popularPackages').get(function() {
  return this.coinPackages.filter(pkg => pkg.popular);
});

// Virtual for getting enabled gateways
pricingSchema.virtual('enabledGateways').get(function() {
  return this.gateways.filter(gateway => gateway.enabled);
});

// Method to calculate total price with tax and fees
pricingSchema.methods.calculateTotalPrice = function(packageIndex: number, gatewayName: string) {
  const pkg = this.coinPackages[packageIndex];
  const gateway = this.gateways.find(g => g.name === gatewayName);
  
  if (!pkg || !gateway) {
    throw new Error('Invalid package or gateway');
  }
  
  const basePrice = pkg.price;
  const taxAmount = (basePrice * this.taxRate) / 100;
  const gatewayFee = (basePrice * gateway.fees.percentage) / 100 + gateway.fees.fixed;
  
  return {
    basePrice,
    taxAmount,
    gatewayFee,
    totalPrice: basePrice + taxAmount + gatewayFee,
    coins: pkg.coins + pkg.bonus
  };
};

const Pricing = mongoose.model('Pricing', pricingSchema);

async function seedPricing() {
  try {
    console.log('💰 Starting Pricing seeding...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Pricing.deleteMany({});
    console.log('🗑️  Cleared existing Pricing configs');

    // Insert new data
    const result = await Pricing.insertMany(pricingConfigs);
    console.log(`✅ Successfully seeded ${result.length} Pricing configs`);

    // Display statistics
    console.log('\n📊 Pricing Statistics:');
    result.forEach(config => {
      console.log(`\n${config.country} (${config.currency}):`);
      console.log(`  Exchange Rate: ${config.exchangeRate.NPR_per_500_coins} ${config.currency} per 500 coins`);
      console.log(`  Tax Rate: ${config.taxRate}%`);
      console.log(`  Packages: ${config.coinPackages.length}`);
      console.log(`  Gateways: ${config.gateways.filter(g => g.enabled).length} enabled`);
      
      const popularPkg = config.coinPackages.find(p => p.popular);
      if (popularPkg) {
        console.log(`  Popular Package: ${popularPkg.coins} coins for ${popularPkg.price} ${config.currency}`);
      }
    });

    console.log('\n🎉 Pricing seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Pricing:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedPricing()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedPricing, Pricing };
