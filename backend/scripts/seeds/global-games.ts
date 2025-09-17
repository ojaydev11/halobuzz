import mongoose from 'mongoose';
import { config } from 'dotenv';
import { GlobalGame } from '../../src/models/GlobalGame';
import fs from 'fs';
import path from 'path';

config();

export async function seedGlobalGames() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
  const connectedHere = mongoose.connection.readyState !== 1;
  if (connectedHere) {
    await mongoose.connect(mongoUri);
  }
  try {
    const dataPath = path.join(__dirname, 'data', 'global-games.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    const games = JSON.parse(raw);
    for (const g of games) {
      await GlobalGame.findOneAndUpdate({ id: g.id }, g, { upsert: true, setDefaultsOnInsert: true });
    }
    console.log(`Seeded ${games.length} global games.`);
  } finally {
    if (connectedHere) await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedGlobalGames().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

