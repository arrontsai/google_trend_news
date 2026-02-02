import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendDigest, generateAndSendUSStockDigest } from '@/lib/digest-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET || 'custom_2026_01_28';
  
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, period = 'manual' } = await req.json();

    if (type === 'tw_trends') {
      const result = await generateAndSendDigest(undefined, period);
      return NextResponse.json(result);
    } else if (type === 'us_stocks') {
      const result = await generateAndSendUSStockDigest(undefined, period);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Manual generation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
