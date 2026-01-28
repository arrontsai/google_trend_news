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

    return { success: true, summary };
  } catch (error: any) {
    console.error('Digest generation failed:', error);
    throw error;
  }
}
