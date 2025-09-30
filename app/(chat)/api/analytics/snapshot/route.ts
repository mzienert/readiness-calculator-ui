import { db } from '@/lib/db';
import { assessmentSnapshot } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, agentType, snapshotData } = body;

    // Validate required fields
    if (!sessionId || !agentType || !snapshotData) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, agentType, snapshotData' },
        { status: 400 }
      );
    }

    // Validate agentType
    if (!['qualifier', 'assessor', 'analyzer'].includes(agentType)) {
      return NextResponse.json(
        { error: 'Invalid agentType. Must be: qualifier, assessor, or analyzer' },
        { status: 400 }
      );
    }

    // Insert anonymized snapshot into database
    const [snapshot] = await db
      .insert(assessmentSnapshot)
      .values({
        sessionId,
        agentType,
        snapshotData,
        createdAt: new Date(),
      })
      .returning();

    console.log(`📊 [Analytics] Saved ${agentType} snapshot for session ${sessionId}`);

    return NextResponse.json({ success: true, id: snapshot.id });
  } catch (error) {
    console.error('❌ [Analytics] Failed to save snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to save snapshot' },
      { status: 500 }
    );
  }
}