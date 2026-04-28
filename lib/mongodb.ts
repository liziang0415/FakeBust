// lib/mongodb.ts
import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  if (process.env.NODE_ENV === "development") {
    global._mongoClientPromise ??= new MongoClient(uri).connect();
    return global._mongoClientPromise;
  }
  return new MongoClient(uri).connect();
}
