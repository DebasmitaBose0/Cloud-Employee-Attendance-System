import { connectDatabase, disconnectDatabase } from '../config/db.ts';
import { seedDatabase } from '../utils/seedData.ts';

async function runSeed() {
  try {
    const forceReset = process.argv.includes('--reset');
    await connectDatabase();
    await seedDatabase(forceReset);
    await disconnectDatabase();
    console.log('[Seed] Completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Failed:', error);
    process.exit(1);
  }
}

runSeed();
