import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VaultRepositoryImpl } from '@/repositories/VaultRepositoryImpl';

export const runtime = 'edge';

// Strict Schema Validation
const SaveSchema = z.object({
    id: z.string().uuid(),
    owner_hash: z.string().min(32),
    title_hash: z.string().min(1),
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

        const { id, owner_hash, title_hash, encrypted_blob, iv } = result.data;

        // Repository Pattern Implementation
        const repository = new VaultRepositoryImpl();
        await repository.save(id, owner_hash, title_hash, encrypted_blob, iv);

        return NextResponse.json({ message: 'Securely Stored' }, { status: 201 });
    } catch (error) {
        console.error('Save Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
