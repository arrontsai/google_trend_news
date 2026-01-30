import { NextRequest, NextResponse } from 'next/server';
import { fetchUSStockNews } from '@/lib/us-stocks';
import { summarizeUSStocksWithGemini } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { pushMessage } from '@/lib/line';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      success: true,
      summary: `**[本地模擬：美股快訊]**
這是在開發環境下生成的模擬內容，用於測試 PDF 下載功能。
1. **美股表現：** 標普 500 指數持平，科技股領漲。
2. **財報關注：** 本週關注大數據公司財報。
3. **備註：** 不消耗任何實際配額。`,
      category: 'us_stocks',
      date: new Date().toLocaleDateString('zh-TW'),
    });
  }

  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting US stock news digest...');

    // 1. Fetch News
    const news = await fetchUSStockNews();
    console.log(`Fetched ${news.length} US stock news items`);

    // 2. Summarize
    const summary = await summarizeUSStocksWithGemini(news);

    // 3. Save to Supabase
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_trends_summary')
      .upsert(
        { 
          date: today, 
          category: 'us_stocks',
          summary_content: summary, 
          raw_data: news,
          line_sent: false 
        },
        { onConflict: 'date,category' }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // 4. Send to LINE (if user ID is known)
    const targetUserId = process.env.LINE_USER_ID; 
    if (targetUserId) {
        await pushMessage(targetUserId, summary);
        await supabase
            .from('daily_trends_summary')
            .update({ line_sent: true })
            .eq('id', data.id);
        console.log(`Sent US stock summary to ${targetUserId}`);
    }

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error('US stock cron job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
