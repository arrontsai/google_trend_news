import { NextRequest, NextResponse } from 'next/server';
import { replyMessage } from '@/lib/line';
import { generateAndSendDigest } from '@/lib/digest-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events;

    for (const event of events) {
      if (event.type === 'message') {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        const messageText = (event.message.text || '').trim();

        console.log(`Received message from User ID: ${userId}: ${messageText}`);

        if (messageText === '新消息' || messageText === '新訊息' || messageText === '新新聞') {
          // 1. Reply immediately to acknowledge
          await replyMessage(replyToken, '正在為您生成最新台股晨報，請稍候... 📈');
          
          // 2. Trigger digest generation (async)
          // Note: In Vercel, this might be cut off if it takes too long.
          // Ideally we would use a queue, but for now we try to run it.
          // We don't await it here to finish the POST request quickly.
          generateAndSendDigest(userId).catch(err => {
            console.error('Manual digest trigger failed:', err);
          });
        } else if (replyToken) {
          await replyMessage(replyToken, `即時熱搜 LINE Bot 已部署成功！\n您的 User ID 是：\n${userId}\n\n傳送「新消息」可即時回報最新財經簡報。`);
        }
      } else if (event.type === 'follow') {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        await replyMessage(replyToken, `歡迎使用台股晨報機器人！\n您的 User ID 是：\n${userId}\n\n傳送「新消息」可即時獲取最新財議簡報。`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
