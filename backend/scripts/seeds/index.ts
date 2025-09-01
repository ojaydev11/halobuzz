import { config } from 'dotenv';
import { seedOGTiers } from './og-tiers';
import { seedGifts } from './gifts';
import { seedFestivals } from './festivals';
import { seedPricing } from './pricing';
import { seedGames } from './games';

// Load environment variables
config();

interface SeedFunction {
  name: string;
  function: () => Promise<void>;
}

const seedFunctions: SeedFunction[] = [
  { name: 'OG Tiers', function: seedOGTiers },
  { name: 'Gifts', function: seedGifts },
  { name: 'Festivals', function: seedFestivals },
  { name: 'Pricing', function: seedPricing },
  { name: 'Games', function: seedGames }
];

async function runAllSeeds() {
  console.log('🚀 Starting HaloBuzz Database Seeding...\n');
  
  const startTime = Date.now();
  const results: { name: string; success: boolean; error?: string; duration: number }[] = [];

  for (const seed of seedFunctions) {
    const seedStartTime = Date.now();
    console.log(`📦 Seeding ${seed.name}...`);
    
    try {
      await seed.function();
      const duration = Date.now() - seedStartTime;
      results.push({ name: seed.name, success: true, duration });
      console.log(`✅ ${seed.name} completed successfully (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - seedStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ name: seed.name, success: false, error: errorMessage, duration });
      console.error(`❌ ${seed.name} failed: ${errorMessage} (${duration}ms)\n`);
    }
  }

  const totalDuration = Date.now() - startTime;
  const successfulSeeds = results.filter(r => r.success).length;
  const failedSeeds = results.filter(r => !r.success).length;

  console.log('📊 Seeding Summary:');
  console.log('='.repeat(50));
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Successful: ${successfulSeeds}/${seedFunctions.length}`);
  console.log(`Failed: ${failedSeeds}/${seedFunctions.length}`);
  console.log('');

  if (failedSeeds > 0) {
    console.log('❌ Failed Seeds:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  ${result.name}: ${result.error}`);
    });
    console.log('');
  }

  if (successfulSeeds === seedFunctions.length) {
    console.log('🎉 All seeds completed successfully!');
    console.log('\n📋 Seeded Collections:');
    console.log('  • OGTier - 5 OG membership tiers');
    console.log('  • Gift - 30+ gifts across 5 categories');
    console.log('  • Festival - 12 major festivals');
    console.log('  • Pricing - 5 country pricing configs');
    console.log('  • Game - 10 casual games');
  } else {
    console.log('⚠️  Some seeds failed. Please check the errors above.');
  }
}

async function runSpecificSeed(seedName: string) {
  const seed = seedFunctions.find(s => 
    s.name.toLowerCase().replace(/\s+/g, '') === seedName.toLowerCase().replace(/\s+/g, '')
  );

  if (!seed) {
    console.error(`❌ Seed "${seedName}" not found. Available seeds:`);
    seedFunctions.forEach(s => console.log(`  • ${s.name}`));
    process.exit(1);
  }

  console.log(`🚀 Running ${seed.name} seed...`);
  const startTime = Date.now();

  try {
    await seed.function();
    const duration = Date.now() - startTime;
    console.log(`\n🎉 ${seed.name} completed successfully in ${duration}ms!`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ${seed.name} failed after ${duration}ms:`);
    console.error(error);
    process.exit(1);
  }
}

function showHelp() {
  console.log('🌱 HaloBuzz Database Seeder');
  console.log('');
  console.log('Usage:');
  console.log('  npm run seed                    # Run all seeds');
  console.log('  npm run seed -- <seed-name>     # Run specific seed');
  console.log('');
  console.log('Available Seeds:');
  seedFunctions.forEach(seed => {
    console.log(`  • ${seed.name}`);
  });
  console.log('');
  console.log('Examples:');
  console.log('  npm run seed -- og-tiers');
  console.log('  npm run seed -- gifts');
  console.log('  npm run seed -- festivals');
  console.log('  npm run seed -- pricing');
  console.log('  npm run seed -- games');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.length === 0) {
    // Run all seeds
    await runAllSeeds();
  } else {
    // Run specific seed
    const seedName = args[0];
    await runSpecificSeed(seedName);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✨ Seeding process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding process failed:', error);
      process.exit(1);
    });
}

export { runAllSeeds, runSpecificSeed, seedFunctions };
