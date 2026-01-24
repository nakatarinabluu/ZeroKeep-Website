import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        // Heartbeat Check
        // Only require GATE 1 (Dashboard Access) to be "Online".
        // Gate 2 (Danger Zone) is optional state.

        const gate1 = req.cookies.get('vault_access_token');

        if (!gate1) {
            return NextResponse.json({ valid: false }, { status: 200 });
        }

        // Deep Check (Optional: Verify Hash again? Or trust Middleware whitelisted path?)
        // Middleware allows /api/sys-monitor/status without check.
        // So we strictly check existence here.
        // Real validation happens on sensitive API calls.

        return NextResponse.json({ valid: true }, { status: 200 });

    } catch (e) {
        return NextResponse.json({ valid: false }, { status: 200 });
    }
}
