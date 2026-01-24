import { NextResponse } from 'next/server';
import { nukeSystem } from '@/lib/system';

export async function POST(req: Request) {
    try {
        // Authenticated by Middleware (Gate 2) (Checked via path /api/vault-ops)

        // Execute Shared Wipe Logic
        await nukeSystem();

        // Return 200 OK so client can handle UI update
        return new NextResponse(JSON.stringify({ success: true, message: "System Wiped" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Wipe failed:", error);
        return new NextResponse("Destruction Failed", { status: 500 });
    }
}
