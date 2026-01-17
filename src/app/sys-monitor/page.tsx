"use client";

import { useState } from "react";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [totp, setTotp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

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

    const handleWipe = async () => {
        if (!confirm("⚠️ SUPER USER WARNING ⚠️\n\nThis will permanently DELETE ALL DATA in the vault.\nThere is NO undo.\n\nAre you absolutely sure?")) {
            return;
        }

        setIsLoading(true);
        setMessage("Initiating Wipe Protocol...");

        try {
            // Send the same credentials or rely on cookie? 
            // For strict state-less simplicity in this V1, let's send credentials again or rely on the cookie set by login.
            // We will rely on the cookie set by the Login route.
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

    if (isAuthenticated) {
        return (
            <div className="min-h-screen bg-black text-red-500 font-mono flex flex-col items-center justify-center p-4">
                <div className="border border-red-800 p-8 rounded-lg max-w-md w-full bg-gray-900 shadow-[0_0_20px_rgba(255,0,0,0.5)]">
                    <h1 className="text-3xl font-bold mb-6 text-center glitch-effect">SUPER USER ACCESS</h1>
                    <p className="text-green-500 mb-8 text-center typewriter">Identity Verified. Command Ready.</p>

                    <div className="space-y-4">
                        <button
                            onClick={handleWipe}
                            disabled={isLoading}
                            className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-4 px-6 rounded border-2 border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.7)] transition-all duration-200 uppercase tracking-widest"
                        >
                            {isLoading ? "EXECUTING..." : "☢️ WIPE ALL DATA"}
                        </button>
                    </div>

                    {message && (
                        <div className="mt-6 p-4 border border-gray-700 bg-black text-center text-sm">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans flex flex-col items-center justify-center p-4">
            <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-800">
                <h1 className="text-2xl font-bold mb-6 text-center text-white">Admin Portal</h1>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-400">Admin Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-gray-950 border border-gray-700 rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            placeholder="Enter Password"
                            required
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
