import { NextRequest, NextResponse } from 'next/server';
import { db, redis } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { z } from 'zod';

export const runtime = 'edge';

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

        const pepperNeon = process.env.PEPPER_NEON;
        const pepperRedis = process.env.PEPPER_REDIS;

        if (!pepperNeon || !pepperRedis) {
            console.error('CRITICAL: Missing PEPPER configuration');
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
        }

        // 1. Fetch records from Neon filtering by owner_hash
        const dbResult = await db.query(
            'SELECT id, title_hash, content_a, iv FROM vault_shards_a WHERE owner_hash = $1',
            [owner_hash]
        );
        const rows = dbResult.rows;

        if (!rows || rows.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Fetch corresponding shards from Redis using mget for efficiency
        const keys = rows.map((row: any) => `shard_b:${row.id}`);

        // redis.mget returns content in the same order as keys
        const redisValues = await redis.mget<string[]>(...keys);

        // 3. Reconstruct the full encrypted_blob
        const responseData = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const content_b_encrypted = redisValues[i];

            // Integrity Check: If Part A exists but Part B is missing.
            if (content_b_encrypted === null || content_b_encrypted === undefined) {
                console.error(`[CRITICAL] Data Integrity Compromised for ID: ${row.id}`);
                // Enterprise: Continue partial results instead of total failure to allow cleanup.
                continue;
            }

            // Dual-Key Decryption
            try {
                // Decrypt Part A (Neon) using PEPPER_NEON
                const partA = await decrypt(row.content_a, pepperNeon);

                // Decrypt Part B (Redis) using PEPPER_REDIS
                const partB = await decrypt(content_b_encrypted, pepperRedis);

                const encrypted_blob = partA + partB;

                responseData.push({
                    id: row.id,
                    title_hash: row.title_hash,
                    encrypted_blob,
                    iv: row.iv,
                });
            } catch (decryptionError) {
                console.error(`[CRITICAL] Decryption Failed for ID: ${row.id}`);
                return NextResponse.json({ error: 'Decryption Error' }, { status: 500 });
            }
        }

        return NextResponse.json(responseData);
    } catch (error) {
        // Enterprise: No stack trace
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
