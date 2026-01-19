"use client";

import { useState } from "react";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [totp, setTotp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/sys-monitor/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, totp }),
            });

            if (res.ok) {
                setIsAuthenticated(true);
                setMessage("Access Granted.");
            } else {
                const error = await res.text();
                setMessage(`Access Denied: ${error}`);
            }
        } catch (err) {
            setMessage("Connection Failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleWipeRequest = () => {
        setShowConfirm(true); // Open Modal
    };

    const executeWipe = async () => {
        setShowConfirm(false); // Close Modal
        setIsLoading(true);
        setMessage("Initiating Wipe Protocol...");

        try {
            const res = await fetch("/api/sys-monitor/wipe", {
                method: "POST",
            });

            if (res.ok) {
                setMessage("✅ SYSTEM PURGED. Vault is empty.");
            } else {
                setMessage("❌ WIPE FAILED. Check logs.");
            }
        } catch (err) {
            setMessage("❌ Network Error during Wipe.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/sys-monitor/logout", { method: "POST" });
        } catch (e) {
            // Ignore network error on logout
        }
        setIsAuthenticated(false);
        setPassword("");
        setTotp("");
        setMessage("Logged Out.");
    };

    // STEALTH MODE: Default is Hidden (looks like 404)
    const [isHidden, setIsHidden] = useState(true);

    if (isAuthenticated) {
        return (
            <div className="min-h-screen bg-black text-red-500 font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="border border-red-800 p-8 rounded-lg max-w-md w-full bg-gray-900 shadow-[0_0_20px_rgba(255,0,0,0.5)] z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold glitch-effect">SUPER USER</h1>
                        <button
                            onClick={handleLogout}
                            className="text-xs border border-red-700 p-2 hover:bg-red-900 transition-colors"
                        >
                            [ SIGN OUT ]
                        </button>
                    </div>

                    <p className="text-green-500 mb-8 text-center typewriter">Identity Verified. Command Ready.</p>

                    <div className="space-y-4">
                        <button
                            onClick={handleWipeRequest}
                            disabled={isLoading}
                            className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-4 px-6 rounded border-2 border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.7)] transition-all duration-200 uppercase tracking-widest"
                        >
                            {isLoading ? "EXECUTING..." : "☢️ WIPE ALL DATA"}
                        </button>

                        <a
                            href="/vault-ops/logs"
                            target="_blank"
                            className="block w-full text-center bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 font-bold py-3 px-6 rounded border border-blue-800 transition-all duration-200 uppercase tracking-widest mt-4"
                        >
                            📊 View Crash Logs
                        </a>
                    </div>

                    {message && (
                        <div className="mt-6 p-4 border border-gray-700 bg-black text-center text-sm">
                            {message}
                        </div>
                    )}
                </div>

                {/* Custom Confirmation Modal */}
                {showConfirm && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="border-2 border-red-600 bg-gray-950 p-8 rounded-xl shadow-[0_0_50px_rgba(255,0,0,0.5)] max-w-sm w-full text-center">
                            <h2 className="text-3xl font-extrabold text-red-500 mb-4 tracking-tighter">⛔ WARNING ⛔</h2>
                            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                                This action is <span className="text-red-500 font-bold">IRREVERSIBLE</span>.
                                <br /><br />
                                All secrets, keys, and backups will be permanently destroyed.
                                <br /><br />
                                Are you absolutely sure?
                            </p>

                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-3 border border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white rounded transition-colors uppercase font-bold text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeWipe}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded shadow-lg transition-transform hover:scale-105 uppercase font-bold text-sm"
                                >
                                    YES, WIPE IT
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // STEALTH UI: Looks like Apache 404 until triggered
    if (isHidden) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-black font-sans cursor-default">
                <div className="text-center">
                    <h1 className="text-9xl font-extrabold text-gray-200">404</h1>
                    <p className="text-2xl md:text-3xl font-light mt-4 text-gray-800">Page Not Found</p>
                    <p className="mt-4 mb-8 text-gray-500">The requested URL /sys-monitor was not found on this server.</p>

                    {/* THE TRIGGER: Clicking this "Footer" reveals the login */}
                    <div
                        onClick={() => setIsHidden(false)}
                        className="text-xs text-gray-300 mt-12 font-mono hover:text-gray-400 transition-colors cursor-pointer"
                        title="Server Info"
                    >
                        Apache/2.4.41 (Ubuntu) Server at localhost Port 80
                    </div>
                </div>
            </div>
        );
    }

    // REAL LOGIN UI (Revealed)
    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans flex flex-col items-center justify-center p-4">
            <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-800 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">System Monitor</h1>
                    <button onClick={() => setIsHidden(true)} className="text-gray-500 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
                    <input type="hidden" value="check" />

                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-400">Admin Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-gray-950 border border-gray-700 rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            placeholder="Enter Password"
                            required
                            autoComplete="new-password"
                            name="admin-pwd-no-save"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-400">2FA Code (Authenticator)</label>
                        <input
                            type="text"
                            value={totp}
                            onChange={(e) => setTotp(e.target.value)}
                            className="w-full p-3 bg-gray-950 border border-gray-700 rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition font-mono tracking-widest text-center"
                            placeholder="000 000"
                            maxLength={6}
                            required
                            autoComplete="one-time-code"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded transition-colors"
                    >
                        {isLoading ? "Verifying..." : "Authenticate"}
                    </button>
                </form>

                {message && (
                    <p className="mt-4 text-center text-red-400 text-sm">{message}</p>
                )}
            </div>
        </div>
    );
}
