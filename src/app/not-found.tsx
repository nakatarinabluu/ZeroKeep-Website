"use client";

import { useState, useEffect } from "react";

export default function NotFound() {
    const [username, setUsername] = useState("");
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
                body: JSON.stringify({ username, password, totp }),
            });
            if (res.ok) {
                // Direct Redirect - Skip "Super User" Screen
                setMessage("Access Granted. Redirecting...");
                window.location.href = "/vault-ops/logs";
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

    // STEALTH MODE
    const [isHidden, setIsHidden] = useState(true);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl + Shift + L to Reveal Login
            if (e.ctrlKey && e.shiftKey && e.key === 'L') setIsHidden(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 1. STEALTH UI: FAKE 404 (Default View)
    if (isHidden) {
        return (
            // Fake 404 Page (Stealth Mode)
            // Mimics default Next.js 404 page style exactly
            <div style={{
                fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
                height: '100vh',
                width: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                backgroundColor: '#000',
                color: '#fff',
                zIndex: 2147483647,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
            }}>
                {/* Stealth Hint: Ctrl+Shift+L to login */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'nowrap'
                }}>
                    <h1 style={{
                        display: 'inline-block',
                        margin: 0,
                        padding: '10px 23px 10px 0',
                        fontSize: '24px',
                        fontWeight: 500,
                        borderRight: '1px solid rgba(255, 255, 255, .3)',
                        verticalAlign: 'top'
                    }}>
                        404
                    </h1>
                    <div style={{
                        display: 'inline-block',
                        textAlign: 'left',
                        lineHeight: '49px',
                        height: '49px',
                        verticalAlign: 'middle',
                        paddingLeft: '20px'
                    }}>
                        <h2 style={{
                            fontSize: '14px',
                            fontWeight: 400,
                            lineHeight: '49px',
                            margin: 0,
                            padding: 0
                        }}>
                            This page could not be found.
                        </h2>
                    </div>
                </div>
            </div>
        );
    }

    // 2. REAL LOGIN UI (Revealed - Dark Mode)
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#000',
            color: '#fff',
            fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: '#000',
                padding: '2rem',
                borderRadius: '8px',
                border: '1px solid #333',
                width: '100%',
                maxWidth: '380px',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff' }}>Authenticate</h1>
                    <button onClick={() => setIsHidden(true)} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                <form onSubmit={handleLogin} autoComplete="off">
                    <input type="hidden" value="check" />

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#888' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                color: '#fff',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                fontFamily: 'monospace'
                            }}
                            placeholder="user"
                            required
                            autoFocus
                            autoComplete="off"
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#888' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                color: '#fff',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                fontFamily: 'monospace'
                            }}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            name="admin-pwd-no-save"
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#888' }}>2FA Code</label>
                        <input
                            type="text"
                            value={totp}
                            onChange={(e) => setTotp(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                color: '#fff',
                                outline: 'none',
                                fontFamily: 'monospace',
                                textAlign: 'center',
                                letterSpacing: '0.2em'
                            }}
                            placeholder="000 000"
                            maxLength={6}
                            required
                            autoComplete="one-time-code"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            backgroundColor: '#b91c1c',
                            color: '#fff',
                            fontWeight: 600,
                            padding: '0.75rem',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {isLoading ? "Verifying..." : "Enter System"}
                    </button>
                </form>

                {message && (
                    <p style={{ marginTop: '1rem', textAlign: 'center', color: '#ef4444', fontSize: '0.875rem' }}>{message}</p>
                )}
            </div>
        </div>
    );
}
