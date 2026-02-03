import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function handleRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET || 'custom_2026_01_28';
  
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let type: string | null = null;
  let period: string | null = null;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      type = body.type;
      period = body.period;
    } catch (e) {
      // Body might be empty
    }
  } else {
    const { searchParams } = new URL(req.url);
    type = searchParams.get('type') || searchParams.get('category');
    period = searchParams.get('period');
  }

  try {
    let query = supabase
      .from('daily_trends_summary')
      .select('category, date, period, summary_content, created_at')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('category', type === 'tw_trends' || type === 'us_stocks' ? type : type);
      // Ensure type mapping if user sends tw_trends or just tw
      const categoryMap: Record<string, string> = {
        'tw': 'tw_trends',
        'tw_trends': 'tw_trends',
        'us': 'us_stocks',
        'us_stocks': 'us_stocks'
      };
      if (categoryMap[type]) {
        query = query.eq('category', categoryMap[type]);
      } else {
        query = query.eq('category', type);
      }
    }
    
    if (period) {
      query = query.eq('period', period);
    }

    const { data, error } = await query.limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'No report found' }, { status: 404 });
    }

    // 回傳格式與 manual-generate 一致
    return NextResponse.json({ 
      success: true, 
      summary: data[0].summary_content,
      metadata: {
        category: data[0].category,
        date: data[0].date,
        period: data[0].period,
        created_at: data[0].created_at
      }
    });
  } catch (error: any) {
    console.error('Fetch latest reports failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}
