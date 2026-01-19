import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "@otplib/preset-default";

export async function POST(req: NextRequest) {
    try {
        const { password, totp } = await req.json();

        const envPassword = process.env.ADMIN_PASSWORD;
        const envSecret = process.env.ADMIN_TOTP_SECRET;

        if (!envPassword || !envSecret) {
            return new NextResponse("Server Configuration Error: Missing Admin Envs", { status: 500 });
        }

        // 1. Check Password
        if (password !== envPassword) {
            return new NextResponse("Invalid Password", { status: 401 });
        }

        // 2. Check TOTP
        try {
            const isValid = authenticator.check(totp, envSecret);
            if (!isValid) {
                return new NextResponse("Invalid TOTP Code", { status: 401 });
            }
        } catch (e) {
            return new NextResponse("TOTP Validation Error", { status: 400 });
        }

        // 3. Set Session Cookie
        const response = new NextResponse("Authenticated", { status: 200 });
        response.cookies.set("admin_session", "valid_super_user", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 15, // 15 minutes session
            sameSite: "strict",
        });

        // 4. Set Vault Access Token (Unlocks /vault-ops/logs)
        response.cookies.set("vault_access_token", "unlocked", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 15, // 15 minutes session
            sameSite: "lax", // Lax to allow navigation from Home to Vault Ops
        });

        return response;
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
