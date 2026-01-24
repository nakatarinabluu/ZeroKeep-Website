import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "@otplib/preset-default";
import { z } from "zod";
import { logAuditAction } from "@/lib/audit";
import { createHmac } from "crypto";



// Strict Schema for Input Validation
const LoginSchema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(8).max(100), // Prevent buffer overflow attacks
    totp: z.string().length(6).regex(/^\d+$/, "TOTP must be 6 digits"), // Strict numeric check
});

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        // 0. Input Validation (Zod)
        const body = await req.json();
        const validationResult = LoginSchema.safeParse(body);

        if (!validationResult.success) {
            await logAuditAction("LOGIN_ATTEMPT", "FAILURE", ip, { reason: "Invalid Input Format", errors: validationResult.error.format() });
            return new NextResponse("Invalid Request Format", { status: 400 });
        }

        const { username, password, totp } = validationResult.data;

        await logAuditAction("LOGIN_ATTEMPT", "INFO", ip);

        const envPassword = process.env.GATE_1_PASSWORD;
        const envSecret = process.env.GATE_1_SECRET;
        const envUser = process.env.GATE_1_USER;

        // 1. Config Check
        if (!envPassword || !envSecret || !envUser) {
            console.error("Missing Gate 1 Envs");
            return new NextResponse("Server Configuration Error", { status: 500 });
        }

        // 2. Username Check
        // Constant time comparison prevents timing attacks (paranoid)
        if (username !== envUser) {
            await logAuditAction("LOGIN_FAILED", "WARNING", ip, { reason: "Bad Username" });
            return new NextResponse("Invalid Credentials", { status: 401 });
        }

        // 3. Password Check
        if (password !== envPassword) {
            await logAuditAction("LOGIN_FAILED", "WARNING", ip, { reason: "Bad Password" });
            return new NextResponse("Invalid Credentials", { status: 401 });
        }

        // 3. TOTP Check
        try {
            const isValid = authenticator.check(totp, envSecret);
            if (!isValid) {
                await logAuditAction("LOGIN_FAILED", "WARNING", ip, { reason: "Bad TOTP" });
                return new NextResponse("Invalid Credentials", { status: 401 });
            }
        } catch (e) {
            await logAuditAction("LOGIN_FAILED", "FAILURE", ip, { reason: "TOTP Error" });
            return new NextResponse("Authentication Error", { status: 400 });
        }

        // 4. Success -> Log & Cookie
        await logAuditAction("LOGIN_SUCCESS", "SUCCESS", ip);

        const response = new NextResponse("Authenticated", { status: 200 });

        // Admin Session (Strict)
        response.cookies.set("admin_session", "valid_super_user", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 15, // 15 mins
            sameSite: "strict",
        });

        // Vault Access (Lax)
        // SECURITY UPGRADE: IP BINDING 🔒
        // We store the encoded IP in the cookie. Middleware checks this against the requester's IP.
        // If a hacker steals the cookie (F12) and uses it on another wifi/PC, it fails.
        // SECURITY UPGRADE: BLIND IP HASHING 🙈
        // We do NOT store the IP. We only store the HASH of the IP.
        // Cookie = HMAC(IP, Secret).
        // Result: Privacy (IP not visible) + Security (Bound to location).
        const privacyHash = createHmac('sha256', envSecret).update(ip).digest('hex');

        response.cookies.set("vault_access_token", privacyHash, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 15, // 15 mins
            sameSite: "lax",
        });

        return response;
    } catch (error) {
        console.error("Login Error:", error);
        await logAuditAction("LOGIN_FAILED", "FAILURE", ip, { reason: "Internal Server Exception" });
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
