import { NextRequest, NextResponse } from 'next/server';
import { replyMessage } from '@/lib/line';
import { generateAndSendDigest } from '@/lib/digest-service';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events;

    for (const event of events) {
      if (event.type === 'message' || event.type === 'follow') {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        
        // Collect user ID to Supabase
        if (userId) {
          await supabase
            .from('line_users')
            .upsert({ 
              user_id: userId,
              last_active: new Date().toISOString()
            }, { onConflict: 'user_id' });
          console.log(`Stored/Updated User ID in Supabase: ${userId}`);
        }

        if (event.type === 'message') {
          const messageText = (event.message.text || '').trim();
          console.log(`Received message from User ID: ${userId}: ${messageText}`);

          if (messageText === '新消息' || messageText === '新訊息' || messageText === '新新聞') {
            await replyMessage(replyToken, '正在為您生成最新台股晨報，請稍候... 📈（處理中，約需 10-15 秒）');
            
            try {
              await generateAndSendDigest(userId);
              console.log('Manual digest generated and sent successfully.');
            } catch (err) {
              console.error('Manual digest trigger failed:', err);
            }
          } else if (replyToken) {
            await replyMessage(replyToken, `即時熱搜 LINE Bot 已部署成功！\n您的 User ID 已自動收集。\n\n傳送「新消息」可即時回報最新財經簡報。`);
          }
        } else if (event.type === 'follow') {
          await replyMessage(replyToken, `歡迎使用台股晨報機器人！\n您的 User ID 已自動存入資料庫。\n\n傳送「新消息」可即時獲取最新財議簡報。`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
