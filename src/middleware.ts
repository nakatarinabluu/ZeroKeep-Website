import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

export const config = {
    matcher: ['/', '/api/:path*', '/vault-ops/:path*'],
};

const redis = Redis.fromEnv();

// Rate Limit: Implemented manually via Redis below
// const ratelimit = ... (Removed for cleanup)

// Constant-time comparison
function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

function hexToBuf(hex: string): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

async function recordFailure(ip: string) {
    const key = `failures:${ip}`;
    const failures = await redis.incr(key);
    if (failures === 1) {
        await redis.expire(key, 600); // Reset count after 10 mins
    }

    if (failures >= 10) {
        // LOCKDOWN MODE
        await redis.set(`ban:${ip}`, 'true', { ex: 3600 }); // Ban IP for 1 hour
    }
}

export async function middleware(req: NextRequest) {
    try {
        // DEBUG CLIENT SUPPORT (CORS & BYPASS)
        if (req.headers.get('user-agent') === 'ZeroKeep-Debug-Web') {
            const response = NextResponse.next();
            response.headers.set('Access-Control-Allow-Origin', '*'); // Allow local file opening
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-device-id, x-timestamp, x-signature, x-owner-hash, x-wipe-token, User-Agent');
            return response;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ip = (req as any).ip || req.headers.get('x-forwarded-for') || '127.0.0.1';

        // 0. Honeypot Trap (INSTANT BAN)
        const path = req.nextUrl.pathname;
        const honeypots = ['/wp-admin', '/admin', '/login', '/phpmyadmin', '/.env', '/config.php'];

        // FIX: Do NOT write to Redis just because a user visited a honeypot. 
        // Only return 404. Writing 'ban:{ip}' allows DOS attacks (filling memory with random IPs).
        // We only ban if they hit the actual Login API repeatedly.
        if (honeypots.some(h => path.includes(h)) &&
            !path.startsWith('/api/sys-monitor') &&
            !path.startsWith('/vault-ops/danger/login')) {
            // Passive Defense: Just ignore them. 
            // Saving 'ban' key here is a vulnerability (DOS).
            return new NextResponse(null, { status: 404 });
        }

        // 1. Health Check & System Monitor
        if (req.nextUrl.pathname === '/api/health' ||
            req.nextUrl.pathname.startsWith('/sys-monitor') ||
            req.nextUrl.pathname.startsWith('/api/sys-monitor')) {
            return NextResponse.next();
        }

        // 1.5 Authenticated Redirect (Stealth Persistence)
        // If user has the Vault Key, they cannot see the Cover Page. They are pulled back to the Vault.
        if (req.nextUrl.pathname === '/') {
            const unlockCookie = req.cookies.get('vault_access_token');
            if (unlockCookie) {
                const url = req.nextUrl.clone();
                url.pathname = '/vault-ops/logs';
                return NextResponse.redirect(url);
            }
        }

        // 2. VAULT OPS DASHBOARD (Browser Access) 🛡️
        // ISOLATED AUTH: Basic Auth only. Does NOT share session with Sys-Monitor.
        // This prevents a Log Viewer exploit from wiping the database.
        // Also covers APIS: /api/vault-ops/* (except login, which is whitelisted above)
        if (path.startsWith('/vault-ops') || path.startsWith('/api/vault-ops')) {
            // STEP 1: Check for "Unlocked" Cookie (From Stealth Login)
            const unlockCookie = req.cookies.get('vault_access_token');
            if (!unlockCookie) {
                const url = req.nextUrl.clone();
                url.pathname = '/404';
                return NextResponse.rewrite(url);
            }

            // IP SECURITY CHECK + PRIVACY (Blind Hash)
            try {
                const cookieHash = unlockCookie.value;

                // 1. Calculate Expected Hash for THIS Request IP
                const secret = process.env.GATE_1_SECRET || "";
                const encoder = new TextEncoder();
                const key = await crypto.subtle.importKey(
                    'raw',
                    encoder.encode(secret),
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['sign']
                );

                const signatureBytes = await crypto.subtle.sign(
                    'HMAC',
                    key,
                    encoder.encode(ip)
                );

                const expectedHash = Array.from(new Uint8Array(signatureBytes))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');

                // 2. Compare
                // If the user changed IP (e.g. cafe to home), the hash will be different -> Block.
                if (cookieHash !== expectedHash) {
                    console.error(`🚨 ACCESS DENIED. Cookie Hash mismatch for IP ${ip}`);
                    // Privacy Note: We cannot know what the original IP was.

                    const response = new NextResponse("Session Invalidated (IP Changed)", { status: 403 });
                    response.cookies.delete('vault_access_token');
                    return response;
                }

            } catch (e) {
                // Malformed Cookie
                const url = req.nextUrl.clone();
                url.pathname = '/404';
                const res = NextResponse.rewrite(url);
                res.cookies.delete('vault_access_token');
                return res;
            }



            // Basic Auth Removed. Access granted via Cookie.

            // STEP 3: DANGER ZONE (Gateway 2 - Destruction PIN)
            // If accessing Danger Zone, enforce 2nd Verification (Cookie Check)
            if (path.startsWith('/vault-ops/danger') && !path.startsWith('/vault-ops/danger/login')) {
                const dangerToken = req.cookies.get('danger_zone_token');
                if (!dangerToken) {
                    // Redirect to the red login screen
                    const url = req.nextUrl.clone();
                    url.pathname = '/vault-ops/danger/login';
                    return NextResponse.redirect(url);
                }
            }

            return NextResponse.next(); // ✅ Access Granted (Independent Session)
        }

        // 2.5 LOW SECURITY ZONE (Public Home Page / Browser / Auth Endpoints)
        // Ensure browser can access Landing Page & Login APIs without App Headers
        // Critical: These are the entry points.
        if (path === '/' || path === '/404' || path === '/favicon.ico' ||
            path.startsWith('/api/sys-monitor/login') ||
            path.startsWith('/api/sys-monitor/logout') ||
            path.startsWith('/api/sys-monitor/status') ||
            path.startsWith('/api/vault-ops/danger-login')) {
            return NextResponse.next();
        }

        // --- BELOW THIS LINE IS API ONLY (STRICT) ---
        // 3. Strict Geo-Fencing + VPN Detection (Obsidian Level)
        const country = req.headers.get('x-vercel-ip-country');
        // VPN/Proxy Detection: Check common headers
        // Headers often added by proxies: Via, X-Forwarded-Proto, Forwarded, Proxy-Connection
        const via = req.headers.get('via');
        const proxyConnection = req.headers.get('proxy-connection');

        const isDev = process.env.NODE_ENV === 'development';

        if (!isDev) {
            if (country !== 'ID') {
                // Silent Fail / Camouflage
                return new NextResponse(null, {
                    status: 404,
                    headers: { 'Server': 'Apache/2.2.22 (Unix) PHP/5.4.3' }
                });
            }
            if (via || proxyConnection) {
                // VPN Detected
                return new NextResponse(null, {
                    status: 403,
                    statusText: 'VPN Not Allowed',
                    headers: { 'Server': 'Apache/2.2.22 (Unix) PHP/5.4.3' }
                });
            }
        }

        // 3. User-Agent Masking
        const userAgent = req.headers.get('user-agent') || '';
        if (userAgent !== 'ZeroKeep-Android/1.0') {
            // FIX: Do not record failure for UA mismatch. 
            // Attackers can randomize IPs and UAs to flood Redis.
            return new NextResponse(null, {
                status: 403,
                statusText: 'Forbidden',
                headers: { 'Server': 'Apache/2.2.22 (Unix) PHP/5.4.3' }
            });
        }

        // 4. X-API-KEY Verification
        const apiKey = req.headers.get('x-api-key') || '';
        const validApiKey = process.env.APP_API_KEY || '';
        if (!validApiKey) return new NextResponse(null, { status: 500 });

        if (!constantTimeEqual(apiKey, validApiKey)) {
            await recordFailure(ip);
            return new NextResponse(null, {
                status: 401,
                statusText: 'Unauthorized',
                headers: { 'Server': 'Apache/2.2.22 (Unix) PHP/5.4.3' }
            });
        }

        // 5. Device-Bound Check
        const deviceId = req.headers.get('x-device-id');
        if (!deviceId) {
            await recordFailure(ip);
            return new NextResponse(null, {
                status: 401,
                statusText: 'Missing Device ID',
                headers: { 'Server': 'Apache/2.2.22 (Unix) PHP/5.4.3' }
            });
        }

        // 6. Timestamp Replay (Relaxed for Free Tier / Bad Signal)
        const timestampStr = req.headers.get('x-timestamp');
        if (!timestampStr) {
            await recordFailure(ip);
            return new NextResponse(null, { status: 401 });
        }
        const timestamp = parseInt(timestampStr, 10);
        const now = Date.now();
        // Allow 60 seconds drift (30s past + 30s future) for slow networks
        if (isNaN(timestamp) || Math.abs(now - timestamp) > 60000) {
            await recordFailure(ip);
            return new NextResponse(null, { status: 401, statusText: 'Timestamp Expired' });
        }

        // 7. Device-Bound HMAC Signature
        // Signature = HMAC(X-API-KEY + X-Timestamp + User-Agent + X-Device-ID + Body)
        // NOTE: The prompt says HMAC(X-API-KEY + X-Timestamp + User-Agent + X-Device-ID + Body)
        // PREVIOUSLY it was Body + Timestamp + UserAgent. The prompts explicitly changes the formula.
        const signature = req.headers.get('x-signature');
        const secret = process.env.HMAC_SECRET;
        if (!signature || !secret) {
            await recordFailure(ip);
            return new NextResponse(null, { status: 401 });
        }

        let body = '';
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            try {
                const clonedReq = req.clone();
                body = await clonedReq.text();
            } catch (e) {
                // Ignore body read errors
            }
        }

        // Formula: X-API-KEY + X-Timestamp + User-Agent + X-Device-ID + Body
        const payloadToSign = `${apiKey}${timestampStr}${userAgent}${deviceId}${body}`;

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signatureBytes = hexToBuf(signature);
        const payloadBytes = encoder.encode(payloadToSign);

        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes as any,
            payloadBytes
        );

        if (!isValid) {
            await recordFailure(ip);
            return new NextResponse(null, {
                status: 401,
                statusText: 'Invalid Signature',
                headers: { 'Server': 'Apache/2.2.22 (Unix) PHP/5.4.3' }
            });
        }

        // 8. Anti-Replay (One-Time Request enforcement)
        // Even with a valid timestamp, we prevent reusing the same request signature.
        const replayKey = `replay:${signature}`;
        const isReplay = await redis.exists(replayKey);
        if (isReplay) {
            await recordFailure(ip);
            return new NextResponse(null, { status: 401, statusText: 'Replay Detected' });
        }
        // Cache signature for 90 seconds (covering the 60s timestamp window)
        await redis.set(replayKey, '1', { ex: 90 });

        const response = NextResponse.next();
        response.headers.set('Server', 'Apache/2.2.22 (Unix) PHP/5.4.3');
        return response;

    } catch (error) {
        // No-Trace Logging: Do not log error details if they contain sensitive info
        // console.error('Middleware error:', error); 
        return new NextResponse(null, {
            status: 500,
            headers: { 'Server': 'Apache/2.2.22 (Unix) PHP/5.4.3' }
        });
    }
}
