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

    async save(id: string, ownerHash: string, encryptedBlob: string, iv: string, orderIndex: number = 0): Promise<void> {
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
            'INSERT INTO vault_shards_a (id, owner_hash, content_a, iv, order_index) VALUES ($1, $2, $3, $4, $5)',
            [id, ownerHash, content_a, iv, orderIndex]
        );

        // 4. Save Part B to Redis
        // Prefix key with 'shard_b:'
        const saveToRedis = redis.set(`shard_b:${id}`, content_b);

        await Promise.all([saveToNeon, saveToRedis]);
    }

    async fetchByOwner(ownerHash: string): Promise<VaultRecord[]> {
        // 1. Fetch Part A from Neon
        const dbResult = await db.query(
            'SELECT id, content_a, iv FROM vault_shards_a WHERE owner_hash = $1 ORDER BY order_index ASC',
            [ownerHash]
        );
        const rows = dbResult.rows;

        if (!rows || rows.length === 0) {
            return [];
        }

        // 2. Fetch Part B from Redis
        const keys = rows.map((row: { id: string }) => `shard_b:${row.id}`);
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
        const ids = dbResult.rows.map((r: { id: string }) => r.id);

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

    async reorder(items: { id: string; order: number }[], ownerHash: string): Promise<void> {
        // Efficient Batch Update using a Single Query with CASE or unnest
        // Since we are using neondatabase/serverless, standard Postgres features work.
        // Using a transaction is safest.

        if (items.length === 0) return;

        // Construct a giant CASE statement or use individual updates in Promise.all?
        // Promise.all is simpler.
        // ENFORCED SECURITY: We MUST include 'owner_hash' in the WHERE clause to prevent 
        // unauthorized reordering of other people's secrets even if they guessed the UUID.

        const updates = items.map(item =>
            db.query(
                'UPDATE vault_shards_a SET order_index = $1 WHERE id = $2 AND owner_hash = $3',
                [item.order, item.id, ownerHash]
            )
        );

        await Promise.all(updates);
    }
}
