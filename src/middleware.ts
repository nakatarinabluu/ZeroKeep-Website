import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const config = {
    matcher: '/api/:path*',
};

const redis = Redis.fromEnv();

// Rate Limiter: 100 requests per minute
const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: false, // No-Trace Logging: Disable analytics
});

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

        const ip = (req as any).ip || req.headers.get('x-forwarded-for') || '127.0.0.1';

        // 0. Health Check & Admin Console Exemption
        if (req.nextUrl.pathname === '/api/health' ||
            req.nextUrl.pathname.startsWith('/sys-monitor') ||
            req.nextUrl.pathname.startsWith('/api/sys-monitor')) {
            return NextResponse.next();
        }

        // 2. Strict Geo-Fencing + VPN Detection (Obsidian Level)
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
            await recordFailure(ip);
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

        // 6. Timestamp Replay
        const timestampStr = req.headers.get('x-timestamp');
        if (!timestampStr) {
            await recordFailure(ip);
            return new NextResponse(null, { status: 401 });
        }
        const timestamp = parseInt(timestampStr, 10);
        const now = Date.now();
        if (isNaN(timestamp) || Math.abs(now - timestamp) > 10000) {
            await recordFailure(ip);
            return new NextResponse(null, { status: 401 });
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
