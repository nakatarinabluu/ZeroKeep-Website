import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VaultRepositoryImpl } from '@/repositories/VaultRepositoryImpl';

export const runtime = 'edge';

// Strict Schema Validation
const SaveSchema = z.object({
    id: z.string().uuid(),
    owner_hash: z.string().min(32),
    encrypted_blob: z.string().min(1),
    iv: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Zod Validation
        const result = SaveSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({
                error: 'Validation Failed',
                details: result.error.flatten()
            }, { status: 400 });
        }

        const { id, owner_hash, encrypted_blob, iv } = result.data;

        // SECURITY: Enforce Header vs Body Consistency
        const headerHash = req.headers.get('x-owner-hash');
        if (!headerHash || headerHash !== owner_hash) {
            return NextResponse.json({
                error: 'Security Alert',
                details: 'Owner Hash Mismatch between Header and Body'
            }, { status: 403 });
        }

        // Repository Pattern Implementation
        const repository = new VaultRepositoryImpl();
        await repository.save(id, owner_hash, encrypted_blob, iv);

        return NextResponse.json({ message: 'Securely Stored' }, { status: 201 });
    } catch (error) {
        console.error('Save Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
