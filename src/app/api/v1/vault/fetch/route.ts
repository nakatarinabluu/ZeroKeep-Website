import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VaultRepositoryImpl } from '@/repositories/VaultRepositoryImpl';

// export const runtime = 'edge'; // Disabled to improve DB stability on Vercel Node.js

const HeadersSchema = z.object({
    owner_hash: z.string().min(32)
});

export async function GET(req: NextRequest) {
    try {
        const owner_hash_header = req.headers.get('x-owner-hash');

        // Zod Validation for Headers
        const result = HeadersSchema.safeParse({ owner_hash: owner_hash_header });

        if (!result.success) {
            return NextResponse.json({
                error: 'Invalid Request',
                details: 'Missing or invalid x-owner-hash'
            }, { status: 400 });
        }

        const { owner_hash } = result.data;

        // Repository Pattern Implementation
        const repository = new VaultRepositoryImpl();
        const records = await repository.fetchByOwner(owner_hash);

        // Transform if necessary to match exact wire format, but Repository VaultRecord matches
        return NextResponse.json(records);

    } catch (error) {
        console.error('Fetch Error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}
