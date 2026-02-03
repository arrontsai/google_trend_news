import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendDigest, generateAndSendUSStockDigest } from '@/lib/digest-service';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET || 'custom_2026_01_28';
  
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, period = 'manual', fetch_only = false } = await req.json();

    // 類別對映
    const categoryMap: Record<string, string> = {
      'tw': 'tw_trends',
      'tw_trends': 'tw_trends',
      'us': 'us_stocks',
      'us_stocks': 'us_stocks'
    };
    const targetCategory = categoryMap[type] || type;

    // 如果 fetch_only=true，只從資料庫讀取，不呼叫 AI model
    if (fetch_only) {
      let query = supabase
        .from('daily_trends_summary')
        .select('*')
        .eq('category', targetCategory)
        .order('created_at', { ascending: false });

      if (period && period !== 'manual') {
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

      // 回傳與生成模式一致的格式
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
    }

    // 原有的生成邏輯
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
