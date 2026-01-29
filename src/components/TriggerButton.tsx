'use client';

import { useState } from 'react';

interface TriggerButtonProps {
  type: 'tw_trends' | 'us_stocks';
  label: string;
}

export default function TriggerButton({ type, label }: TriggerButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleTrigger = async () => {
    if (loading) return;
    
    setLoading(true);
    setStatus(`正在生成${type === 'tw_trends' ? '台股' : '美股'}最新簡報...`);
    
    try {
      const secret = 'custom_2026_01_28'; 
      const endpoint = type === 'tw_trends' ? '/api/cron/daily-digest' : '/api/cron/us-stock';
      
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secret}`
        }
      });

      if (res.ok) {
        setStatus('✅ 生成成功！請刷新網頁或查看 LINE。');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const errData = await res.json();
        setStatus(`❌ 失敗: ${errData.error || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('Trigger failed:', error);
      setStatus('❌ 請求失敗，請檢查網路連線。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleTrigger}
        disabled={loading}
        className={`w-full rounded-xl py-4 font-bold text-white transition-all shadow-lg active:scale-95 ${
          loading 
            ? 'bg-zinc-400 cursor-not-allowed' 
            : type === 'tw_trends'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            生成中...
          </div>
        ) : (
          label
        )}
      </button>
      
      {status && (
        <p className={`text-center text-xs font-medium ${
          status.startsWith('❌') ? 'text-red-500' : 
          status.startsWith('✅') ? 'text-green-500' : 'text-indigo-600 animate-pulse'
        }`}>
          {status}
        </p>
      )}
    </div>
  );
}
