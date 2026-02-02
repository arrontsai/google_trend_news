import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import ReportCard from '@/components/ReportCard';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

async function getLatestSummaries() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_trends_summary')
    .select('*')
    .eq('date', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching summaries:', error);
    return { tw: null, us: null };
  }

  const twTrend = data?.find(item => item.category === 'tw_trends') || null;
  const usStock = data?.find(item => item.category === 'us_stocks') || null;

  return { tw: twTrend, us: usStock };
}

export default async function Home() {
  const { tw, us } = await getLatestSummaries();
  const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">G</div>
            <h1 className="text-xl font-bold tracking-tight">全球投資情報助手</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-zinc-500">
            {todayStr}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Taiwan Stocks Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 uppercase tracking-tight">🇹🇼 台股即時晨報</h2>
              <span className="text-xs font-bold text-zinc-400">CATEGORY: TW_TRENDS</span>
            </div>
            
            {tw ? (
              <ReportCard 
                summary={tw.summary_content} 
                category="tw_trends" 
                date={todayStr} 
                lineSent={tw.line_sent} 
              />
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
                <p className="text-zinc-500 text-sm">今日尚無台股摘要。</p>
              </div>
            )}
          </section>

          {/* US Stocks Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 uppercase tracking-tight">🇺🇸 美股即時快訊</h2>
              <span className="text-xs font-bold text-zinc-400">CATEGORY: US_STOCKS</span>
            </div>
            
            {us ? (
              <ReportCard 
                summary={us.summary_content} 
                category="us_stocks" 
                date={todayStr} 
                lineSent={us.line_sent} 
              />
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
                <p className="text-zinc-500 text-sm">今日尚無美股摘要。</p>
              </div>
            )}
          </section>
        </div>

        {/* LINE Guide moved to bottom or simplified */}
        <section className="mt-20 rounded-3xl bg-indigo-600 p-10 text-white overflow-hidden relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="shrink-0 rounded-2xl bg-white p-3 shadow-2xl rotate-3">
              <Image 
                src="/images/line-qr-code.png" 
                alt="LINE QR Code" 
                width={140} 
                height={140}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black">訂閱 LINE 即時推播</h3>
              <p className="text-indigo-100 max-w-lg leading-relaxed">
                每日 08:00 AM 自動發送，您也可以隨時對 Bot 傳送「**台股**」或「**美股**」獲取最新分析。
              </p>
              <a 
                href="https://line.me/R/ti/p/@605cwpjk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#06C755] px-8 py-3 text-sm font-bold text-white hover:bg-[#05b34c] transition-all shadow-lg hover:scale-105"
              >
                直接加入好友
              </a>
            </div>
          </div>
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-12 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-center text-sm text-zinc-500">
          Global Investment Assistant &copy; 2026. Built with Next.js & Gemini.
        </p>
      </footer>
    </div>
  );
}
