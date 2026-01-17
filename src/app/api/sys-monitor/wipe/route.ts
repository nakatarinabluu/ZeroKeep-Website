import { NextRequest, NextResponse } from "next/server";
import { db, redis } from "@/lib/db";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const sessionToken = req.cookies.get("admin_session")?.value;

        // 1. Verify Session
        if (!sessionToken || sessionToken !== "valid_super_user") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // 2. Perform Wipe
        const wipeNeon = db.query('TRUNCATE TABLE vault_shards_a');
        const wipeRedis = redis.flushdb();

        await Promise.all([wipeNeon, wipeRedis]);

        console.warn(`[ADMIN] SYSTEM WIPE COMPLETED via Web Admin Interface`);

        return NextResponse.json({ message: 'System Wiped' }, { status: 200 });

    } catch (error) {
        console.error("Wipe Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
