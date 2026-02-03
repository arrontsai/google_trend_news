import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function handle(req: NextRequest) {
  // 強制觸發動態渲染 (這會讓 Vercel 知道不能預編譯為靜態)
  await headers(); 

  try {
    // 1. 驗證 Authorization
    const authHeader = req.headers.get('authorization');
    const secret = process.env.CRON_SECRET || 'custom_2026_01_28';
    
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 獲取參數
    let type = '';
    let period = '';

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        type = body.type || body.category || '';
        period = body.period || '';
      } catch (e) {
        // Allow empty POST body
      }
    } else {
      const { searchParams } = new URL(req.url);
      type = searchParams.get('type') || searchParams.get('category') || '';
      period = searchParams.get('period') || '';
    }

    // 3. 類別對映
    const categoryMap: Record<string, string> = {
      'tw': 'tw_trends',
      'tw_trends': 'tw_trends',
      'us': 'us_stocks',
      'us_stocks': 'us_stocks'
    };
    const targetCategory = categoryMap[type] || type || 'tw_trends';

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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Report not found',
        debug: { category: targetCategory, period }
      }, { status: 404 });
    }

    // 5. 回傳與 manual-generate 一致的格式
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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
