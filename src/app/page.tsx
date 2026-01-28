import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import TriggerButton from '@/components/TriggerButton';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

async function getSummaries() {
  const { data, error } = await supabase
    .from('daily_trends_summary')
    .select('*')
    .order('date', { ascending: false })
    .limit(7);

  if (error) {
    console.error('Error fetching summaries:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return [];
  }
  return data || [];
}

export default async function Home() {
  const summaries = await getSummaries();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">G</div>
            <h1 className="text-xl font-bold tracking-tight">Google Trends TW</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Live Monitoring
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Main Content: Summaries */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6">Latest Summaries</h2>
              <div className="space-y-8">
                {summaries.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
                    <p className="text-zinc-500">尚無摘要數據，請先執行 Cron Job API。</p>
                  </div>
                ) : (
                  summaries.map((item) => (
                    <article key={item.id} className="group relative rounded-2xl border border-zinc-200 bg-white p-8 transition-all hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/50">
                      <time className="mb-2 block text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {new Date(item.date).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                      <div className="prose prose-zinc dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-zinc-800 dark:text-zinc-200">
                          {item.summary_content}
                        </pre>
                      </div>
                      <div className="mt-6 flex items-center gap-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Source: Multi-Source (PTT / News / Trends / X)
                        </span>
                        {item.line_sent && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Sent to LINE
                          </span>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar: Setup Guide */}
          <div className="space-y-8">
            <section className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 text-center">手動控制台</h3>
              <TriggerButton />
              <p className="mt-4 text-[10px] text-zinc-400 text-center leading-relaxed">
                點擊按鈕將即時抓取 PTT/Trends 最新資料並更新網頁與 LINE。
              </p>
            </section>

            <section className="rounded-2xl bg-indigo-600 p-8 text-white">
              <h3 className="text-xl font-bold mb-4">LINE Bot Setup</h3>
              
              {/* QR Code Section */}
              <div className="mb-6 rounded-xl bg-white p-3 shadow-inner inline-block">
                <Image 
                  src="/images/line-qr-code.png" 
                  alt="LINE QR Code" 
                  width={150} 
                  height={150}
                  className="rounded-lg"
                />
              </div>

              <p className="mb-6 text-indigo-100 text-sm leading-relaxed">
                台股晨報機器人已全面升級！現在只需完成以下簡單動作即可自動訂閱：
              </p>
              <ol className="space-y-4 text-sm font-medium">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">1</span>
                  <span>掃描上方 QR Code 加入好友（或將 Bot 拉入群組）。</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">2</span>
                  <span>**系統會自動註冊**，每天 08:00 AM 準時發送簡報。</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">3</span>
                  <span>對 Bot 傳送「**新消息**」可即時生成盤中/盤後分析。</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">4</span>
                  <span>封鎖機器人或退出群組將自動停止訂閱。</span>
                </li>
              </ol>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="font-bold mb-4">API Endpoints</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase mb-1">Trigger Cron Job</p>
                  <code className="block rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-800 overflow-x-auto">
                    GET /api/cron/daily-digest
                  </code>
                </div>
                <p className="text-xs text-zinc-500 italic">
                  * Remember to include the Authorization header.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-6 py-12 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-center text-sm text-zinc-500">
          Google Trends TW Digest &copy; 2026. Built with Next.js, Supabase, and OpenAI/Gemini.
        </p>
      </footer>
    </div>
  );
}
