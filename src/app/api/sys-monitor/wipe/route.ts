import { NextRequest, NextResponse } from "next/server";
import { db, redis } from "@/lib/db";
import { logAuditAction } from "@/lib/audit";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    try {
        const sessionToken = req.cookies.get("admin_session")?.value;

        // 1. Verify Session
        if (!sessionToken || sessionToken !== "valid_super_user") {
            await logAuditAction("LOGIN_FAILED", "WARNING", ip, { reason: "Unauthorized Wipe Attempt" });
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // 2. Perform Wipe
        const wipeNeon = db.query('TRUNCATE TABLE vault_shards_a');
        const wipeRedis = redis.flushdb();

        await Promise.all([wipeNeon, wipeRedis]);

        console.warn(`[ADMIN] SYSTEM WIPE COMPLETED via Web Admin Interface`);
        await logAuditAction("WIPE_COMPLETED", "SUCCESS", ip, { action: "SYSTEM_WIPE" });

        return NextResponse.json({ message: 'System Wiped' }, { status: 200 });

    } catch (error) {
        console.error("Wipe Error:", error);
        await logAuditAction("WIPE_INITIATED", "FAILURE", ip, { error: String(error) });
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
