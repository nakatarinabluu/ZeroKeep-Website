
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="px-2 py-0.5 rounded-full bg-black/[.05] dark:bg-white/[.1] border border-black/[.05] text-[10px] font-medium font-[family-name:var(--font-geist-mono)]">
            {children}
        </span>
    );
}

interface LogsDashboardProps {
    crashLogs: any[];
    auditLogs: any[];
}

export default function LogsDashboard({ crashLogs, auditLogs }: LogsDashboardProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tab = searchParams.get("tab") || "crashes";

    // Stealth Modal State
    const [showStealthModal, setShowStealthModal] = useState(false);
    const [step, setStep] = useState<"LOGIN" | "WIPE">("LOGIN");

    // Login Form State
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Session Heartbeat: Check if cookie is still valid every 5s
    // Polls /api/sys-monitor/status (Returned 200 OK) to avoid console errors.
    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch('/api/sys-monitor/status');
                if (res.ok) {
                    const data = await res.json();
                    // If server says "Invalid Session", Reload -> Middleware Trap
                    if (!data.valid) {
                        window.location.reload();
                    }
                }
            } catch (e) {
                // Ignore network errors
            }
        };

        const interval = setInterval(checkSession, 5000); // 5 seconds
        return () => clearInterval(interval);
    }, []);

    // Hotkey Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl + Shift + U (Unlock)
            if (e.ctrlKey && e.shiftKey && (e.key === "U" || e.key === "u")) {
                e.preventDefault();
                setShowStealthModal(true);
                setStep("LOGIN"); // Always reset to login on open
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/vault-ops/danger-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, pin }),
            });

            if (res.ok) {
                setStep("WIPE");
            } else {
                const msg = await res.text();
                setError(msg || "Access Denied");
            }
        } catch (err) {
            setError("Connection Error.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleWipe = async () => {
        if (!confirm("Are you sure you want to perform this action?")) return;

        // Call the wipe API
        // NOTE: We need to create a simple form submission or fetch call.
        // Existing logic used a Form Action. We can use fetch here.
        try {
            const res = await fetch("/api/vault-ops/wipe", { method: "POST" });
            if (res.ok) {
                alert("Operation Successful.");
                setShowStealthModal(false);
                router.refresh(); // Reload to show empty logs
            } else {
                // If session is dead (401/403/404), kick them out immediately
                if (res.status === 401 || res.status === 403 || res.status === 404) {
                    window.location.reload();
                    return;
                }
                alert("Operation Failed: " + res.statusText);
            }
        } catch (e) {
            alert("Error");
        }
    };

    const handleDisconnect = async () => {
        try {
            await fetch("/api/sys-monitor/logout", { method: "POST" });
            window.location.href = "/"; // Force full reload to clear state
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    return (
        <div className="min-h-screen p-8 pb-20 font-[family-name:var(--font-geist-sans)] max-w-6xl mx-auto">

            {/* --- STEALTH MODAL (GATE 2) --- */}
            {showStealthModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background border border-black/[.08] dark:border-white/[.145] rounded-xl shadow-xl p-8 max-w-sm w-full relative">
                        <button
                            onClick={() => setShowStealthModal(false)}
                            className="absolute top-4 right-4 text-foreground/50 hover:text-foreground transition-colors"
                        >✕</button>

                        <h2 className="text-lg font-semibold mb-6 text-foreground tracking-tight">
                            {step === "LOGIN" ? "Authentication Required" : "System Operations"}
                        </h2>

                        {step === "LOGIN" && (
                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-foreground/60 mb-2 font-[family-name:var(--font-geist-mono)]">USERNAME</label>
                                    <input value={username} onChange={e => setUsername(e.target.value)} autoFocus className="w-full bg-transparent border border-black/[.1] dark:border-white/[.1] rounded-lg p-2.5 text-sm font-[family-name:var(--font-geist-mono)] outline-none focus:ring-1 focus:ring-foreground transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground/60 mb-2 font-[family-name:var(--font-geist-mono)]">PASSWORD</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-transparent border border-black/[.1] dark:border-white/[.1] rounded-lg p-2.5 text-sm font-[family-name:var(--font-geist-mono)] outline-none focus:ring-1 focus:ring-foreground transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-foreground/60 mb-2 font-[family-name:var(--font-geist-mono)]">CODE</label>
                                    <input value={pin} onChange={e => setPin(e.target.value)} maxLength={6} className="w-full bg-transparent border border-black/[.1] dark:border-white/[.1] rounded-lg p-2.5 text-sm font-[family-name:var(--font-geist-mono)] text-center tracking-widest outline-none focus:ring-1 focus:ring-foreground transition-all" />
                                </div>
                                <button type="submit" disabled={isLoading} className="rounded-full bg-foreground text-background text-sm h-12 px-5 font-medium mt-4 hover:opacity-90 transition-opacity">
                                    {isLoading ? "Verifying..." : "Access"}
                                </button>
                                {error && <div className="text-xs text-red-500 text-center mt-2 font-[family-name:var(--font-geist-mono)]">{error}</div>}
                            </form>
                        )}

                        {step === "WIPE" && (
                            <div className="space-y-6">
                                <p className="text-sm text-foreground/70">
                                    Authorized access granted. Internal storage cleanup available.
                                    <br /><br />
                                    <strong>Warning:</strong> This action is irreversible.
                                </p>
                                <button onClick={handleWipe} className="w-full rounded-full border border-red-500/50 text-red-500 hover:bg-red-500/10 text-sm h-12 font-medium transition-colors uppercase tracking-widest">
                                    ☢️ Execute Cleanup
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}


            <header className="mb-12 flex items-center justify-between border-b border-black/[.08] dark:border-white/[.08] pb-4">
                <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
                <div className="flex gap-6 text-sm items-center">
                    {/* Tabs */}
                    <button onClick={() => router.push("/vault-ops/logs?tab=crashes")}
                        className={cn("transition-colors hover:text-foreground", tab === 'crashes' ? "text-foreground font-medium" : "text-foreground/60")}>
                        Crashes
                    </button>
                    <button onClick={() => router.push("/vault-ops/logs?tab=audit")}
                        className={cn("transition-colors hover:text-foreground", tab === 'audit' ? "text-foreground font-medium" : "text-foreground/60")}>
                        Audit
                    </button>

                    {/* DIVIDER */}
                    <div className="h-4 w-px bg-black/[.1] dark:bg-white/[.1] mx-2"></div>

                    {/* DISCONNECT BUTTON */}
                    <button onClick={handleDisconnect} className="text-red-500 hover:text-red-600 transition-colors font-medium">
                        Disconnect
                    </button>
                </div>
            </header>

            <div className="overflow-x-auto">
                {/* --- CRASH LOGS --- */}
                {tab === 'crashes' && (
                    <table className="w-full text-left text-sm">
                        <thead className="text-foreground/50 border-b border-black/[.08] dark:border-white/[.08]">
                            <tr>
                                <th className="p-4 font-normal">Timestamp</th>
                                <th className="p-4 font-normal">Device</th>
                                <th className="p-4 font-normal">Exception</th>
                                <th className="p-4 font-normal">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[.08] dark:divide-white/[.08]">
                            {crashLogs.map((log: any) => (
                                <tr key={log.id} className="group">
                                    <td className="p-4 font-[family-name:var(--font-geist-mono)] text-xs text-foreground/70">
                                        {new Date(parseInt(log.timestamp)).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-medium">{log.device}</td>
                                    <td className="p-4"><Badge>{log.exception}</Badge></td>
                                    <td className="p-4 text-xs text-foreground/50 font-[family-name:var(--font-geist-mono)] max-w-xs truncate">
                                        {log.stacktrace}
                                    </td>
                                </tr>
                            ))}
                            {crashLogs.length === 0 && (
                                <tr><td colSpan={4} className="p-12 text-center text-foreground/40">No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* --- AUDIT LOGS --- */}
                {tab === 'audit' && (
                    <table className="w-full text-left text-sm">
                        <thead className="text-foreground/50 border-b border-black/[.08] dark:border-white/[.08]">
                            <tr>
                                <th className="p-4 font-normal">Timestamp</th>
                                <th className="p-4 font-normal">Event</th>
                                <th className="p-4 font-normal">Status</th>
                                <th className="p-4 font-normal">IP</th>
                                <th className="p-4 font-normal">Metadata</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[.08] dark:divide-white/[.08]">
                            {auditLogs.map((log: any) => (
                                <tr key={log.id}>
                                    <td className="p-4 font-[family-name:var(--font-geist-mono)] text-xs text-foreground/70">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-medium">{log.action}</td>
                                    <td className="p-4"><Badge>{log.status}</Badge></td>
                                    <td className="p-4 font-[family-name:var(--font-geist-mono)] text-xs">{log.actor_ip}</td>
                                    <td className="p-4 text-xs text-foreground/50 font-[family-name:var(--font-geist-mono)]">
                                        {log.metadata || "-"}
                                    </td>
                                </tr>
                            ))}
                            {auditLogs.length === 0 && (
                                <tr><td colSpan={5} className="p-12 text-center text-foreground/40">No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
