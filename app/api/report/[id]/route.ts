// app/api/report/[id]/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { Analysis } from "@/types/analysis";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const client = await clientPromise;
    const doc = await client
      .db("fakebuster")
      .collection<Analysis & { _id: string }>("analyses")
      .findOne({ _id: id });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
