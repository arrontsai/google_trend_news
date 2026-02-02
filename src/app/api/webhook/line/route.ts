import { NextRequest, NextResponse } from 'next/server';
import { replyMessage } from '@/lib/line';
import { generateAndSendDigest, sendLatestStockPrices, generateAndSendUSStockDigest, sendLatestSummary } from '@/lib/digest-service';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events;

    for (const event of events) {
      // 1. Extract Target ID (supports User, Group, or Room)
      const source = event.source;
      const targetId = source.userId || source.groupId || source.roomId;
      const sourceType = source.type; // 'user', 'group', or 'room'

      console.log(`Event [${event.type}] from ${sourceType}: ${targetId}`);

      // 2. Automatic Subscription Discovery
      if (['follow', 'join', 'message'].includes(event.type) && targetId) {
        await supabase
          .from('line_users')
          .upsert({ 
            user_id: targetId,
            last_active: new Date().toISOString()
          }, { onConflict: 'user_id' });
        console.log(`Subscribed Target ID: ${targetId}`);
      }

      // 3. Automatic Unsubscription (Cleanup)
      if (['unfollow', 'leave'].includes(event.type) && targetId) {
        await supabase
          .from('line_users')
          .delete()
          .eq('user_id', targetId);
        console.log(`Unsubscribed Target ID: ${targetId}`);
        continue;
      }

      // 4. Message Handling
      if (event.type === 'message') {
        const replyToken = event.replyToken;
        const messageText = (event.message.text || '').trim();

        if (messageText === '新消息' || messageText === '新訊息' || messageText === '台股' || messageText === 'TW') {
          try {
            await sendLatestSummary(targetId, 'tw_trends');
          } catch (err) {
            console.error('Manual digest fetch failed:', err);
          }
        } else if (messageText === '美股' || messageText === 'US') {
          try {
            await sendLatestSummary(targetId, 'us_stocks');
          } catch (err) {
            console.error('Manual US stock fetch failed:', err);
          }
        } else if (messageText === '股票價格' || messageText === '查詢價格') {
          try {
            await sendLatestStockPrices(targetId);
          } catch (err) {
            console.error('Price query failed:', err);
          }
        } else if (replyToken) {
          await replyMessage(
            replyToken, 
            `即時投資情報助手服務中！\n此對話已自動加入訂閱清單。\n\n請點選下方按鈕獲取資訊：`,
            ['台股', '美股', '股票價格']
          );
        }
      } else if (event.type === 'follow' || event.type === 'join') {
        const replyToken = event.replyToken;
        await replyMessage(
          replyToken, 
          `歡迎使用全球投資情報助手！\n每日將自動為您發送最新晨報。\n\n請點選下方按鈕開始體驗：`,
          ['台股', '美股', '股票價格']
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
