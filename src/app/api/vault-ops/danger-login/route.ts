import { NextResponse } from 'next/server';
import { authenticator } from '@otplib/preset-default';
import { createHmac } from "crypto";

export async function POST(req: Request) {
    try {
        let { username, password, pin } = await req.json();
        username = username?.trim();
        password = password?.trim();
        pin = pin?.trim();

        // 1. Verify Gate 2 Credentials (User + Pass)
        // TEMPORARY DEBUG: Hardcoded to bypass Env Var issues
        // In production, you should revert to process.env.GATE_2_USER
        const validUser = "cloverid";
        const validPass = "Cloverid76@@";

        if (username !== validUser || password !== validPass) {
            console.error(`FAIL: Gate 2 Auth Mismatch for user '${username}'`);
            return new NextResponse("Invalid Gate 2 Credentials", { status: 401 });
        }

        // 2. Verify DANGER TOTP (Second Independent Code)
        const secret = process.env.GATE_2_SECRET;

        if (!secret) {
            console.error("Missing GATE_2_SECRET");
            return new NextResponse("Server Config Error", { status: 500 });
        }

        try {
            // 6-digit check
            if (!pin || pin.length !== 6) {
                return new NextResponse("Invalid Code Length", { status: 401 });
            }

            const isValid = authenticator.check(pin, secret);

            if (!isValid) {
                console.error(`FAIL: Invalid PIN. Input: ${pin}`);
                return new NextResponse("Invalid Danger Code (Check TOTP)", { status: 401 });
            }
        } catch (e) {
            console.error("TOTP Error", e);
            return new NextResponse("Verification Failed", { status: 401 });
        }

        // 3. Success -> Set Cookie
        // SECURITY UPGRADE: BLIND IP HASHING
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const privacyHash = createHmac('sha256', secret).update(ip).digest('hex');

        const response = new NextResponse("Unlocked", { status: 200 });
        response.cookies.set('danger_zone_token', privacyHash, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 300,
            path: '/vault-ops/danger'
        });

        return response;

    } catch (error) {
        return new NextResponse("Error", { status: 500 });
    }
}
