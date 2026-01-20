
import { db } from '@/lib/db';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const dynamic = 'force-dynamic';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Simple Badge Component
function Badge({ variant = 'info', children }: { variant?: 'info' | 'error' | 'success' | 'warning', children: React.ReactNode }) {
    const variants = {
        info: "bg-blue-100 text-blue-800",
        error: "bg-red-100 text-red-800",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
    };
    return (
        <span className={cn("px-2 py-1 rounded text-xs font-semibold", variants[variant])}>
            {children}
        </span>
    );
}

export default async function SecurityCenterPage({ searchParams }: { searchParams: { tab?: string } }) {
    const tab = searchParams?.tab || 'crashes';

    // Fetch Data Parallel 
    const crashLogsPromise = db.query('SELECT * FROM crash_logs ORDER BY created_at DESC LIMIT 50');
    const auditLogsPromise = db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');

    const [crashRes, auditRes] = await Promise.all([crashLogsPromise, auditLogsPromise]);

    const crashLogs = crashRes.rows;
    const auditLogs = auditRes.rows;

    return (
        <div className="p-8 bg-soft-cloud min-h-screen font-mono text-gray-700">
            <header className="mb-8 flex justify-between items-center border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-midnight-blue tracking-widest flex items-center gap-3">
                        🛡️ SECURITY OPERATIONS
                    </h1>
                    <p className="text-sky-blue text-sm mt-1">Global System Overwatch</p>
                </div>
                <div className="flex gap-2">
                    <a href="/vault-ops/logs?tab=crashes" className={cn("px-4 py-2 rounded transition-all", tab === 'crashes' ? "bg-red-900/50 text-red-200 border border-red-700" : "hover:bg-gray-800")}>
                        💥 CRASHES
                    </a>
                    <a href="/vault-ops/logs?tab=audit" className={cn("px-4 py-2 rounded transition-all", tab === 'audit' ? "bg-blue-900/50 text-blue-200 border border-blue-700" : "hover:bg-gray-800")}>
                        🕵️ AUDIT TRAIL
                    </a>
                </div>
            </header>

            <div className="bg-pure-white border border-gray-200 rounded-lg overflow-hidden shadow-xl">
                {/* --- CRASH LOGS --- */}
                {tab === 'crashes' && (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-midnight-blue font-bold border-b border-gray-200 uppercase">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Device</th>
                                <th className="p-4">Exception</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {crashLogs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-soft-cloud transition">
                                    <td className="p-4 whitespace-nowrap text-gray-600">
                                        {new Date(parseInt(log.timestamp)).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-bold text-midnight-blue">{log.device}</td>
                                    <td className="p-4">
                                        <Badge variant="error">{log.exception}</Badge>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500 max-w-md truncate">
                                        {log.stacktrace.substring(0, 100)}...
                                    </td>
                                </tr>
                            ))}
                            {crashLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-gray-500">
                                        No crashes reported. System stable.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* --- AUDIT LOGS --- */}
                {tab === 'audit' && (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-midnight-blue font-bold border-b border-gray-200 uppercase">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Event</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actor IP</th>
                                <th className="p-4">Metadata</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {auditLogs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-soft-cloud transition">
                                    <td className="p-4 whitespace-nowrap text-gray-600">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-bold text-midnight-blue tracking-wide">
                                        {log.action}
                                    </td>
                                    <td className="p-4">
                                        <Badge variant={
                                            log.status === 'SUCCESS' ? 'success' :
                                                log.status === 'FAILURE' ? 'error' :
                                                    log.status === 'WARNING' ? 'warning' : 'info'
                                        }>
                                            {log.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4 font-mono text-xs">{log.actor_ip}</td>
                                    <td className="p-4 text-xs text-gray-500 font-mono">
                                        {log.metadata || "-"}
                                    </td>
                                </tr>
                            ))}
                            {auditLogs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">
                                        No audit records found. Spooky. 👻
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
