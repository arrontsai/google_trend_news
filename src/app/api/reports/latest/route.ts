import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET || 'custom_2026_01_28';
  
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category'); // tw_trends or us_stocks
  const period = searchParams.get('period');     // morning, evening, or manual

  try {
    let query = supabase
      .from('daily_trends_summary')
      .select('category, date, period, summary_content, created_at')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }
    
    if (period) {
      query = query.eq('period', period);
    }

    // If neither category nor period is specified, we might want just the latest ones
    // But for a generic "latest" API, let's just return what they asked or the top 10
    const { data, error } = await query.limit(10);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch latest reports failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
