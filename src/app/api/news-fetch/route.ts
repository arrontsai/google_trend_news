import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 封裝邏輯以供 GET 與 POST 共用
async function handleRequest(req: NextRequest) {
  try {
    // 1. 驗證 Authorization
    const authHeader = req.headers.get('authorization');
    const secret = process.env.CRON_SECRET || 'custom_2026_01_28';
    
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      console.warn('API Unauthorized access attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 解析參數
    let type: string | null = null;
    let period: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      type = body.type || body.category;
      period = body.period;
    } else {
      const { searchParams } = new URL(req.url);
      type = searchParams.get('type') || searchParams.get('category');
      period = searchParams.get('period');
    }

    // 3. 處理類別對照
    const categoryMap: Record<string, string> = {
      'tw': 'tw_trends',
      'tw_trends': 'tw_trends',
      'us': 'us_stocks',
      'us_stocks': 'us_stocks'
    };
    const targetCategory = categoryMap[type || ''] || type || 'tw_trends';

    // 4. 查詢資料庫
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
      console.error('Database query error:', error);
      return NextResponse.json({ success: false, error: 'Database query failed' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Report not found',
        debug: { category: targetCategory, period: period || 'any' }
      }, { status: 404 });
    }

    // 5. 回傳資料 (格式與 manual-generate 一致)
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

// 明確匯出 GET 與 POST
export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}
