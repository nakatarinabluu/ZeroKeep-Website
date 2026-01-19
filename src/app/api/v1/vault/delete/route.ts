import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VaultRepositoryImpl } from '@/repositories/VaultRepositoryImpl';

export const runtime = 'edge';

const DeleteSchema = z.object({
    id: z.string().uuid()
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = DeleteSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({
                error: 'Validation Failed',
                details: result.error.flatten()
            }, { status: 400 });
        }

        const { id } = result.data;

        // Repository Pattern Implementation
        const repository = new VaultRepositoryImpl();
        await repository.delete(id);

        return NextResponse.json({ message: 'Deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
