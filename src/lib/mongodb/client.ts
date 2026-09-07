import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export function isMongoConfigured(): boolean {
  const uri = process.env.MONGODB_URI;
  return Boolean(uri && uri.length > 0 && !uri.includes('placeholder'));
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (!isMongoConfigured()) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI!;
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      dbName: 'expenro',
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log('[MongoDB] Connected successfully to database:', mongooseInstance.connection.name);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to connect to MongoDB:', e);
    return null;
  }

  return cached.conn;
}
