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
    const tickerRegex = /\(([\dA-Z.\^]{3,10})\)/g;
    const matches = Array.from(summary.matchAll(tickerRegex));
    const uniqueTickers = Array.from(new Set(matches.map(m => m[1])));

    let finalSummary = summary;
    let trackedStocks: any[] = [];

    if (uniqueTickers.length > 0) {
      console.log(`Fetching prices for: ${uniqueTickers.join(', ')}`);
      const priceResults = await Promise.all(uniqueTickers.map(t => getPriceTrend(t)));
      const filteredPrices = priceResults.filter(p => p.price !== null);
      trackedStocks = filteredPrices;
      
      if (filteredPrices.length > 0) {
        const priceTrendSection = '\n\n📈 標的近期漲跌回顧：\n' + 
          filteredPrices.map(p => formatPriceTrend(p)).join('\n');
        finalSummary += priceTrendSection;
        console.log('Price trends appended to summary.');
      }
    }

    // 3. Save to Supabase
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_trends_summary')
      .upsert(
        { 
          date: today, 
          summary_content: finalSummary, 
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
        name: stock.name,
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
        await Promise.all(userIds.map(id => pushMessage(id, finalSummary).catch(e => console.error(`Error sending to ${id}:`, e))));
        
        // Update DB to mark as sent
        await supabase
            .from('daily_trends_summary')
            .update({ line_sent: true })
            .eq('id', data.id);
    } else {
        console.log('No user IDs found for broadcast.');
    }

    return { success: true, summary: finalSummary };
  } catch (error: any) {
    console.error('Digest generation failed:', error);
    throw error;
  }
}
