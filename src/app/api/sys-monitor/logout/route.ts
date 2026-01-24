import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({ message: "Logged out" });

    // Destroy Cookie
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0), // Expire immediately
        sameSite: "strict" as const,
    };

    // Destroy ALL Cookies
    response.cookies.set("admin_session", "", cookieOptions);
    response.cookies.set("vault_access_token", "", cookieOptions);
    response.cookies.set("danger_zone_token", "", cookieOptions);

    return response;
}
