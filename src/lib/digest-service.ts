import { fetchAllTrends } from './trends';
import { summarizeTrends } from './ai-service';
import { supabase } from './supabase';
import { pushMessage } from './line';

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

    // 4. Send to LINE
    const userId = targetUserId || process.env.LINE_USER_ID;

    if (userId) {
        await pushMessage(userId, summary);
        // Update DB to mark as sent
        await supabase
            .from('daily_trends_summary')
            .update({ line_sent: true })
            .eq('id', data.id);
        console.log(`Sent message to ${userId}`);
    } else {
        console.log('No user ID provided, skipping message send.');
    }

    return { success: true, summary };
  } catch (error: any) {
    console.error('Digest generation failed:', error);
    throw error;
  }
}
