import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VaultRepositoryImpl } from '@/repositories/VaultRepositoryImpl';
import { logAuditAction } from '@/lib/audit';

export const runtime = 'edge';

const DeleteSchema = z.object({
    id: z.string().uuid()
});

export async function POST(req: NextRequest) {
    // SECURITY POLICY: Deletion is disabled for the App.
    // Only Administrators with direct database access can delete records.
    return NextResponse.json(
        { error: 'Deletion is disabled by policy. Contact Administrator.' },
        { status: 403 }
    );
}
