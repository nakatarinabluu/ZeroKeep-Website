
import { db } from '@/lib/db';
import LogsDashboard from './LogsDashboard';

export const dynamic = 'force-dynamic';

export default async function SecurityCenterPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    // Fetch Data Parallel 
    const crashLogsPromise = db.query('SELECT * FROM crash_logs ORDER BY created_at DESC LIMIT 50');
    const auditLogsPromise = db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');

    const [crashRes, auditRes] = await Promise.all([crashLogsPromise, auditLogsPromise]);

    const crashLogs = crashRes.rows;
    const auditLogs = auditRes.rows;

    return (
        <LogsDashboard crashLogs={crashLogs} auditLogs={auditLogs} />
    );
}
