import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendDigest } from '@/lib/digest-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      success: true,
      data: {
        summary_content: `**[本地模擬：台股報表]**
這是在開發環境下生成的模擬內容，用於測試 PDF 下載功能。
1. **熱門族群：** AI 伺服器、散熱元件。
2. **市場氛圍：** 觀望氣氛濃厚，量能萎縮。
3. **備註：** 不消耗任何實際配額。`,
        category: 'tw_trends',
        date: new Date().toLocaleDateString('zh-TW'),
        line_sent: false
      }
    });
  }

  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 取得台北時間 (UTC+8)
    const now = new Date();
    const taipeiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const hours = taipeiTime.getUTCHours();
    
    // 08:00 -> morning, 18:00 -> evening
    // 考量到 cron 可能有些微延遲，給予一點緩衝範圍
    const period = (hours >= 5 && hours <= 11) ? 'morning' : 'evening';
    
    console.log(`Cron triggered at Taipei hour ${hours}. Selecting period: ${period}`);
    
    const result = await generateAndSendDigest(undefined, period);
    return NextResponse.json({ ...result, period });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
