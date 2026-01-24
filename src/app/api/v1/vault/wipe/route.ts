import { NextRequest, NextResponse } from 'next/server';
import { db, redis } from '@/lib/db';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    // SECURITY POLICY: Wipe is disabled for the App.
    // Only Administrators with direct database access can wipe data.
    return NextResponse.json(
        { error: 'System Wipe is disabled by policy.' },
        { status: 403 }
    );
}
