import { db, redis } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';
import { IVaultRepository, VaultRecord } from './IVaultRepository';

export class VaultRepositoryImpl implements IVaultRepository {
    private pepperNeon: string;
    private pepperRedis: string;

    constructor() {
        // Enforce Pepper existence at runtime instantiation
        const neon = process.env.PEPPER_NEON;
        const redisPepper = process.env.PEPPER_REDIS;

        if (!neon || !redisPepper) {
            throw new Error('CRITICAL: Missing PEPPER configuration');
        }

        this.pepperNeon = neon;
        this.pepperRedis = redisPepper;
    }

    async save(id: string, ownerHash: string, titleHash: string, encryptedBlob: string, iv: string): Promise<void> {
        // 1. Split the original encrypted_blob
        const mid = Math.floor(encryptedBlob.length / 2);
        const rawPartA = encryptedBlob.slice(0, mid);
        const rawPartB = encryptedBlob.slice(mid);

        // 2. Dual-Key Encryption
        // Part A -> Neon
        const content_a = await encrypt(rawPartA, this.pepperNeon);
        // Part B -> Redis
        const content_b = await encrypt(rawPartB, this.pepperRedis);

        // 3. Save Part A to Neon
        const saveToNeon = db.query(
            'INSERT INTO vault_shards_a (id, owner_hash, title_hash, content_a, iv) VALUES ($1, $2, $3, $4, $5)',
            [id, ownerHash, titleHash, content_a, iv]
        );

        // 4. Save Part B to Redis
        // Prefix key with 'shard_b:'
        const saveToRedis = redis.set(`shard_b:${id}`, content_b);

        await Promise.all([saveToNeon, saveToRedis]);
    }

    async fetchByOwner(ownerHash: string): Promise<VaultRecord[]> {
        // 1. Fetch Part A from Neon
        const dbResult = await db.query(
            'SELECT id, title_hash, content_a, iv FROM vault_shards_a WHERE owner_hash = $1',
            [ownerHash]
        );
        const rows = dbResult.rows;

        if (!rows || rows.length === 0) {
            return [];
        }

        // 2. Fetch Part B from Redis
        const keys = rows.map((row: any) => `shard_b:${row.id}`);
        const redisValues = await redis.mget<string[]>(...keys);

        const results: VaultRecord[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const content_b_encrypted = redisValues[i];

            if (!content_b_encrypted) {
                console.error(`[CRITICAL] Zombie Data for ID: ${row.id}. Auto-healing...`);
                // Self-Healing
                this.delete(row.id).catch(e => console.error('Auto-heal failed', e));
                continue;
            }

            try {
                // Dual-Key Decryption
                const partA = await decrypt(row.content_a, this.pepperNeon);
                const partB = await decrypt(content_b_encrypted, this.pepperRedis);

                results.push({
                    id: row.id,
                    owner_hash: ownerHash,
                    title_hash: row.title_hash,
                    encrypted_blob: partA + partB,
                    iv: row.iv,
                });
            } catch (e) {
                console.error(`[CRITICAL] Decryption Failed for ID: ${row.id}`, e);
                continue;
            }
        }

        return results;
    }

    async delete(id: string): Promise<void> {
        const deleteFromNeon = db.query('DELETE FROM vault_shards_a WHERE id = $1', [id]);
        const deleteFromRedis = redis.del(`shard_b:${id}`);
        await Promise.all([deleteFromNeon, deleteFromRedis]);
    }

    async wipeByOwner(ownerHash: string): Promise<void> {
        // Expensive operation: Fetch all IDs first, then delete.
        // Or just delete from SQL and let Redis expire/orphan?
        // For security, strict deletion is better.

        const dbResult = await db.query('SELECT id FROM vault_shards_a WHERE owner_hash = $1', [ownerHash]);
        const ids = dbResult.rows.map((r: any) => r.id);

        if (ids.length === 0) return;

        const deleteFromNeon = db.query('DELETE FROM vault_shards_a WHERE owner_hash = $1', [ownerHash]);

        // Batch delete from Redis (pipeline not available in http wrapper, so explicit loop or mdel if available?)
        // Upstash http wrapper 'del' accepts multiple keys? Check docs or assume one by one for safety.
        // Actually redis.del accepts string | string[], let's try mapping.
        const redisKeys = ids.map((id: string) => `shard_b:${id}`);
        // Note: The simple wrapper defined in db.ts might strict types on del.
        // Let's assume loop for safety with Promise.all
        const deleteFromRedis = Promise.all(redisKeys.map((k: string) => redis.del(k)));

        await Promise.all([deleteFromNeon, deleteFromRedis]);
    }
}
