import { db } from '@/lib/db';

export type AuditAction =
    | 'LOGIN_ATTEMPT'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'WIPE_INITIATED'
    | 'WIPE_COMPLETED'
    | 'VIEW_CRASH_LOGS';

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'WARNING' | 'INFO';

/**
 * Logs a security event to the immutable audit_logs table.
 */
export async function logAuditAction(
    action: AuditAction,
    status: AuditStatus,
    ip: string,
    metadata?: Record<string, any>
) {
    try {
        const metadataStr = metadata ? JSON.stringify(metadata) : null;

        await db.query(
            'INSERT INTO audit_logs (action, status, actor_ip, metadata) VALUES ($1, $2, $3, $4)',
            [action, status, ip, metadataStr]
        );

        console.log(`📝 AUDIT: [${action}] ${status} - ${ip}`);
    } catch (error) {
        // Fallback: If DB fails, we MUST log to stdout for recovery
        console.error('🚨 CRITICAL: FAILED TO WRITE AUDIT LOG TO DB', error);
    }
}
