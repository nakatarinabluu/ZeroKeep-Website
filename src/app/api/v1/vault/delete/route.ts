import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VaultRepositoryImpl } from '@/repositories/VaultRepositoryImpl';
import { logAuditAction } from '@/lib/audit';

export const runtime = 'edge';

const DeleteSchema = z.object({
    id: z.string().uuid()
});

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    try {
        const body = await req.json();
        const result = DeleteSchema.safeParse(body);

        if (!result.success) {
            await logAuditAction("LOGIN_FAILED", "WARNING", ip, { reason: "Invalid Delete Request", error: result.error.flatten() });
            return NextResponse.json({
                error: 'Validation Failed',
                details: result.error.flatten()
            }, { status: 400 });
        }

        const { id } = result.data;

        // Repository Pattern Implementation
        const repository = new VaultRepositoryImpl();
        await repository.delete(id);

        await logAuditAction("WIPE_INITIATED", "SUCCESS", ip, { action: "DELETE_ENTRY", id });

        return NextResponse.json({ message: 'Deleted' }, { status: 200 });
    } catch (error) {
        console.error('Delete Error:', error);
        await logAuditAction("WIPE_INITIATED", "FAILURE", ip, { action: "DELETE_ENTRY_ERROR", error: String(error) });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
