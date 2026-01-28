import { fetchAllTrends } from './trends';
import { summarizeTrends } from './ai-service';
import { supabase } from './supabase';
import { pushMessage } from './line';
import { getPriceTrend, formatPriceTrend } from './finance';

export async function generateAndSendDigest(targetUserId?: string) {
  try {
    console.log('Generating digest...');

    // 1. Fetch Trends (Consolidated from Multiple Sources)
    console.log('Fetching trends from PTT, Google News, Trends, X...');
    const trends = await fetchAllTrends();
    console.log(`Fetched ${trends.length} items. Starting AI summarization...`);

    // 2. Summarize
    const summary = await summarizeTrends(trends);
    console.log('AI Summary generated successfully.');

    // 2.5 Extract Tickers and Add Price Trends
    // Look for patterns like Name(Ticker)
    const tickerRegex = /([\u4e00-\u9fa5\w\s]+)\(([\dA-Z.\^]{3,10})\)/g;
    const matches = Array.from(summary.matchAll(tickerRegex));
    
    // Create a map of ticker -> name for uniqueness and name recall
    const tickerMap = new Map<string, string>();
    matches.forEach(m => {
      const name = m[1].trim();
      const ticker = m[2];
      if (!tickerMap.has(ticker)) {
        tickerMap.set(ticker, name);
      }
    });

    let trackedStocks: any[] = [];

    if (tickerMap.size > 0) {
      console.log(`Fetching prices for: ${Array.from(tickerMap.keys()).join(', ')}`);
      const priceResults = await Promise.all(
        Array.from(tickerMap.entries()).map(([ticker, name]) => getPriceTrend(ticker, name))
      );
      trackedStocks = priceResults.filter(p => p.price !== null);
    }

    // 3. Save to Supabase
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_trends_summary')
      .upsert(
        { 
          date: today, 
          summary_content: summary, 
          raw_data: trends,
          line_sent: false 
        },
        { onConflict: 'date' }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // 3.5 Save Stock Tracking Data
    if (trackedStocks.length > 0 && data) {
      console.log(`Saving ${trackedStocks.length} tracked stocks to DB...`);
      const trackingRows = trackedStocks.map(stock => ({
        summary_id: data.id,
        date: today,
        symbol: stock.symbol,
        name_zh: stock.nameZh,
        name_en: stock.nameEn,
        price: stock.price,
        change_percent: stock.changePercent,
        currency: stock.currency,
        raw_metadata: stock // Store the whole object for now
      }));

      const { error: trackingError } = await supabase
        .from('stock_tracking')
        .insert(trackingRows);

      if (trackingError) {
        console.error('Error saving stock tracking data:', trackingError);
        // We don't throw here to avoid failing the whole digest if tracking fails
      }
    }

    // 4. Send to LINE
    let userIds: string[] = [];
    if (targetUserId) {
      userIds = [targetUserId];
    } else {
      // Fetch all users from Supabase
      const { data: users, error: userError } = await supabase
        .from('line_users')
        .select('user_id');
      
      if (!userError && users) {
        userIds = users.map(u => u.user_id);
      }
      
      // Fallback if DB is empty but env var exists
      if (userIds.length === 0 && process.env.LINE_USER_ID) {
        userIds = [process.env.LINE_USER_ID];
      }
    }

    if (userIds.length > 0) {
        console.log(`Broadcasting to ${userIds.length} users...`);
        await Promise.all(userIds.map(id => pushMessage(id, summary).catch(e => console.error(`Error sending to ${id}:`, e))));
        
        // Update DB to mark as sent
        await supabase
            .from('daily_trends_summary')
            .update({ line_sent: true })
            .eq('id', data.id);
    } else {
        console.log('No user IDs found for broadcast.');
    }

    return { success: true, summary: summary };
  } catch (error: any) {
    console.error('Digest generation failed:', error);
    throw error;
  }
}

export async function sendLatestStockPrices(targetUserId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Get the latest summary ID for today
    const { data: summary, error: summaryError } = await supabase
      .from('daily_trends_summary')
      .select('id')
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (summaryError || !summary) {
      return await pushMessage(targetUserId, '今日尚未生成分析報告，請先傳送「新消息」！');
    }

    // 2. Get tracked stocks for this summary
    const { data: stocks, error: stockError } = await supabase
      .from('stock_tracking')
      .select('*')
      .eq('summary_id', summary.id);

    if (stockError || !stocks || stocks.length === 0) {
      return await pushMessage(targetUserId, '今日分析報告中未偵測到明確的標的關鍵字。');
    }

    // 3. Format and send
    const priceTrendSection = '📈 標的近期漲跌回顧：\n' + 
      stocks.map(p => {
        // Re-construct PriceTrend object for formatting
        const trend = {
          symbol: p.symbol,
          nameZh: p.name_zh,
          nameEn: p.name_en,
          price: p.price ? Number(p.price) : null,
          changePercent: p.change_percent ? Number(p.change_percent) : null,
          currency: p.currency
        };
        return formatPriceTrend(trend);
      }).join('\n');

    await pushMessage(targetUserId, priceTrendSection);
    return { success: true };
  } catch (err) {
    console.error('Failed to send stock prices:', err);
    throw err;
  }
}
