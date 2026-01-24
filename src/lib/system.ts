import { db, redis } from "@/lib/db";

/**
 * Performs a complete system wipe (Nuclear Option).
 * 1. Truncates Vault Data.
 * 2. Clears Logs.
 * 3. Flushes Cache.
 */
export async function nukeSystem() {
    console.warn("⚠️ SYSTEM NUKE INITIATED");

    // 1. Wipe Data (Critical)
    const wipeVault = db.query('TRUNCATE TABLE vault_shards_a');

    // 2. Wipe Logs (Evidence)
    const wipeCrash = db.query('DELETE FROM crash_logs');
    const wipeAudit = db.query('DELETE FROM audit_logs');

    // 3. Flush Cache
    const wipeRedis = redis.flushdb();

    // Execute in parallel
    await Promise.all([wipeVault, wipeCrash, wipeAudit, wipeRedis]);

    console.warn("✅ SYSTEM NUKE COMPLETED");
    return true;
}
