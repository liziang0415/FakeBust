// app/api/recent/route.ts
import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await getMongoClient();
    const docs = await client
      .db("fakebuster")
      .collection("analyses")
      .find(
        {},
        { projection: { _id: 1, verdict: 1, detectedLanguage: 1, originalText: 1, createdAt: 1 } }
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
