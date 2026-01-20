"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // ... (Auth Logic remains identical) ...
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

  const handleWipeRequest = () => setShowConfirm(true);

  const executeWipe = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    setMessage("Initiating Wipe Protocol...");
    try {
      const res = await fetch("/api/sys-monitor/wipe", { method: "POST" });
      if (res.ok) setMessage("✅ SYSTEM PURGED. Vault is empty.");
      else setMessage("❌ WIPE FAILED. Check logs.");
    } catch (err) {
      setMessage("❌ Network Error during Wipe.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await fetch("/api/sys-monitor/logout", { method: "POST" }); } catch (e) { }
    setIsAuthenticated(false);
    setPassword("");
    setTotp("");
    setMessage("Logged Out.");
  };

  // STEALTH MODE
  const [isHidden, setIsHidden] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') setIsHidden(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-soft-cloud text-red-500 font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Logged In View (Preserved) */}
        <div className="border border-red-200 p-8 rounded-lg max-w-md w-full bg-pure-white shadow-xl z-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold glitch-effect text-midnight-blue">SUPER USER</h1>
            <button onClick={handleLogout} className="text-xs border border-red-300 text-red-600 p-2 hover:bg-red-50 transition-colors">[ SIGN OUT ]</button>
          </div>
          <p className="text-green-600 mb-8 text-center typewriter bg-green-50 p-2 rounded">Identity Verified. Command Ready.</p>
          <div className="space-y-4">
            <button onClick={handleWipeRequest} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded border-2 border-red-500 shadow-lg transition-all duration-200 uppercase tracking-widest">{isLoading ? "EXECUTING..." : "☢️ WIPE ALL DATA"}</button>
            <a href="/vault-ops/logs" target="_blank" className="block w-full text-center bg-white hover:bg-sky-blue text-sky-blue hover:text-white font-bold py-3 px-6 rounded border border-sky-blue transition-all duration-200 uppercase tracking-widest mt-4">📊 View Crash Logs</a>
          </div>
          {message && <div className="mt-6 p-4 border border-gray-200 bg-gray-50 text-center text-sm text-gray-700">{message}</div>}
        </div>
        {showConfirm && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="border-2 border-red-600 bg-gray-950 p-8 rounded-xl shadow-[0_0_50px_rgba(255,0,0,0.5)] max-w-sm w-full text-center">
              <h2 className="text-3xl font-extrabold text-red-500 mb-4 tracking-tighter">⛔ WARNING ⛔</h2>
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">This action is <span className="text-red-500 font-bold">IRREVERSIBLE</span>.<br /><br />All secrets, keys, and backups will be permanently destroyed.<br /><br />Are you absolutely sure?</p>
              <div className="flex space-x-4">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white rounded transition-colors uppercase font-bold text-sm">Cancel</button>
                <button onClick={executeWipe} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded shadow-lg transition-transform hover:scale-105 uppercase font-bold text-sm">YES, WIPE IT</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STEALTH UI: MIDNIGHT BLUE THEME
  if (isHidden) {
    return (
      // Fake 404 Page (Stealth Mode)
      // Mimics default Next.js 404 page style exactly
      <div style={{
        fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
        height: '100vh',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff'
      }}>
        {/* Stealth Hint: Ctrl+Shift+L to login */}
        <div>
          <h1 style={{
            display: 'inline-block',
            margin: 0,
            marginRight: '20px',
            padding: '10px 23px 10px 0',
            fontSize: '24px',
            fontWeight: 500,
            verticalAlign: 'top',
            borderRight: '1px solid rgba(255, 255, 255, .3)'
          }}>
            404
          </h1>
          <div style={{
            display: 'inline-block',
            textAlign: 'left',
            lineHeight: '49px',
            height: '49px',
            verticalAlign: 'middle'
          }}>
            <h2 style={{
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: 'inherit',
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

  // REAL LOGIN UI (Revealed)
  return (
    <div className="min-h-screen bg-soft-cloud text-gray-800 font-sans flex flex-col items-center justify-center p-4">
      <div className="bg-pure-white p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-midnight-blue">System Monitor</h1>
          <button onClick={() => setIsHidden(true)} className="text-gray-400 hover:text-midnight-blue">✕</button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
          <input type="hidden" value="check" />

          <div>
            <label className="block text-sm font-medium mb-2 text-midnight-blue">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded text-gray-900 focus:border-sky-blue focus:ring-1 focus:ring-sky-blue outline-none transition"
              placeholder="Enter Password"
              required
              autoComplete="new-password"
              name="admin-pwd-no-save"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-midnight-blue">2FA Code</label>
            <input
              type="text"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded text-gray-900 focus:border-sky-blue focus:ring-1 focus:ring-sky-blue outline-none transition font-mono tracking-widest text-center"
              placeholder="000 000"
              maxLength={6}
              required
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-midnight-blue hover:bg-sky-blue text-white font-bold py-3 px-4 rounded transition-colors shadow-lg"
          >
            {isLoading ? "Verifying..." : "Authenticate"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-red-300 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
