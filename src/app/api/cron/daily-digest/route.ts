import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleTrends } from '@/lib/trends';
import { summarizeTrends } from '@/lib/ai-service';
import { supabase } from '@/lib/supabase';
import { pushMessage } from '@/lib/line';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(req: NextRequest) {
  // Security check: Validate the Cron Secret or Vercel signature
  // For simplicity given the prompt, we check for CRON_SECRET if provided in headers
  // Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` if you configured it.
  // Or check against `process.env.CRON_SECRET` manually.
  
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting daily digest...');

    // 1. Fetch Trends
    const trends = await fetchGoogleTrends();
    console.log(`Fetched ${trends.length} trends`);

    // 2. Summarize
    const summary = await summarizeTrends(trends);
    console.log('Generated summary:', summary);

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

    // 4. Send to LINE (if user ID is known and stored/env)
    // Here we assume a single admin user for now, or we could fetch subscribers from DB.
    // The prompt says "line那段還沒拿到user id", so we might not be able to send yet.
    // However, the code logic should be ready. We can check an env var for the target user ID.
    const targetUserId = process.env.LINE_USER_ID; 

    if (targetUserId) {
        await pushMessage(targetUserId, summary);
        // Update DB to mark as sent
        await supabase
            .from('daily_trends_summary')
            .update({ line_sent: true })
            .eq('id', data.id);
        console.log(`Sent message to ${targetUserId}`);
    } else {
        console.log('No LINE_USER_ID found, skipping message send.');
    }

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
