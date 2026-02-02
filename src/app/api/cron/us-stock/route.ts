import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendUSStockDigest } from '@/lib/digest-service';

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
    // 取得台北時間 (UTC+8)
    const now = new Date();
    const taipeiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const hours = taipeiTime.getUTCHours();
    
    // 08:00 -> morning, 18:00 -> evening
    const period = (hours >= 5 && hours <= 11) ? 'morning' : 'evening';
    
    console.log(`US Stock Cron triggered at Taipei hour ${hours}. Selecting period: ${period}`);

    const result = await generateAndSendUSStockDigest(undefined, period);
    return NextResponse.json({ ...result, period });
  } catch (error: any) {
    console.error('US stock cron job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
