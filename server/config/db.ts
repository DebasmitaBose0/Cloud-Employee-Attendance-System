import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.ts';

let memoryServer: MongoMemoryServer | null = null;

export interface DbConnectionResult {
  uri: string;
  mode: 'external' | 'memory';
}

export async function connectDatabase(): Promise<DbConnectionResult> {
  mongoose.set('strictQuery', true);

  const rawUri = env.mongoUri.trim();
  const useMemoryKeyword = ['memory', 'auto', 'none'].includes(rawUri.toLowerCase());

  if (rawUri && !useMemoryKeyword) {
    try {
      await mongoose.connect(rawUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[MongoDB] Connected to external database`);
      return { uri: rawUri, mode: 'external' };
    } catch (error) {
      if (env.nodeEnv === 'production') {
        console.error('[MongoDB] Failed to connect to MONGO_URI in production:', error);
        throw error;
      }
      console.warn(
        '[MongoDB] External MONGO_URI unavailable in development, falling back to MongoMemoryServer...'
      );
    }
  }

  // Fallback for sandbox / local dev without a running mongod service
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'attendance_system',
      },
    });
  }
  const uri = memoryServer.getUri();
  await mongoose.connect(uri);
  console.log(`[MongoDB] Connected to in-process MongoMemoryServer (${uri})`);
  return { uri, mode: 'memory' };
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
