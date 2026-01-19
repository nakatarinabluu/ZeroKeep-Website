import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { timestamp, thread, exception, stacktrace, device } = body;

        // Save to Database (Enterprise Persistence)
        await db.query(
            'INSERT INTO crash_logs (timestamp, device, thread, exception, stacktrace) VALUES ($1, $2, $3, $4, $5)',
            [timestamp, device, thread, exception, stacktrace]
        );

        console.log(`✅ Crash Logged: ${exception} from ${device}`);

        return NextResponse.json({ success: true, message: "Crash logged successfully" });
    } catch (error) {
        console.error("Failed to save crash log", error);
        return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
}
