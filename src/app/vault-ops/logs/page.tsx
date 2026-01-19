
import { db } from '@/lib/db';

// Force dynamic rendering so we always see new logs
export const dynamic = 'force-dynamic';

export default async function CrashLogsPage() {
    const result = await db.query('SELECT * FROM crash_logs ORDER BY created_at DESC LIMIT 50');
    const logs = result.rows;

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">🚨 Crash Reports (Admin)</h1>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Time
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Device
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Exception
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Stack Preview
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log: any) => (
                            <tr key={log.id}>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p className="text-gray-900 whitespace-no-wrap">
                                        {new Date(parseInt(log.timestamp)).toLocaleString()}
                                    </p>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <p className="text-gray-900 whitespace-no-wrap">{log.device}</p>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span className="relative inline-block px-3 py-1 font-semibold text-red-900 leading-tight">
                                        <span aria-hidden className="absolute inset-0 bg-red-200 opacity-50 rounded-full"></span>
                                        <span className="relative">{log.exception}</span>
                                    </span>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm font-mono text-xs text-gray-500">
                                    {log.stacktrace.substring(0, 100)}...
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    No crashes reported. Good job! 🚀
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
