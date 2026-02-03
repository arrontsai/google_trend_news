import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function handle(req: NextRequest) {
  // 1. 身分驗證
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET || 'custom_2026_01_28';
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2. 獲取參數 (支援 POST body 或 GET searchParams)
  let type = '';
  let period = '';
  try {
    if (req.method === 'POST') {
      const body = await req.json();
      type = body.type || body.category || '';
      period = body.period || '';
    } else {
      const { searchParams } = new URL(req.url);
      type = searchParams.get('type') || searchParams.get('category') || '';
      period = searchParams.get('period') || '';
    }
  } catch (e) {
    // 忽略解析錯誤
  }

  // 3. 查詢資料庫
  try {
    const categoryMap: Record<string, string> = {
      'tw': 'tw_trends',
      'tw_trends': 'tw_trends',
      'us': 'us_stocks',
      'us_stocks': 'us_stocks'
    };
    const targetCategory = categoryMap[type] || type || 'tw_trends';

    let query = supabase
      .from('daily_trends_summary')
      .select('*')
      .eq('category', targetCategory)
      .order('created_at', { ascending: false });

    if (period) {
      query = query.eq('period', period);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('DB Query Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No report found', 
        debug: { type, targetCategory, period } 
      }, { status: 404 });
    }

    // 回應格式與 manual-generate 一致，並附帶中繼資料
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
  } catch (err: any) {
    console.error('API Internal Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
