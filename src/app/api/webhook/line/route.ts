import { NextRequest, NextResponse } from 'next/server';
import { replyMessage } from '@/lib/line';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events;

    for (const event of events) {
      if (event.type === 'message' || event.type === 'follow') {
        const userId = event.source.userId;
        const replyToken = event.replyToken;

        console.log(`Received event from User ID: ${userId}`);

        if (replyToken) {
          await replyMessage(replyToken, `即時熱搜 LINE Bot 已部署成功！\n您的 User ID 是：\n${userId}\n\n請將此 ID 設定到 Vercel 的環境變數 LINE_USER_ID 中。`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
