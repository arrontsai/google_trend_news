'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ReportCardProps {
  summary: string;
  category: 'tw_trends' | 'us_stocks';
  date: string;
  lineSent?: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({ summary, category, date, lineSent }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const title = category === 'tw_trends' ? '🇹🇼 台股即時晨報' : '🇺🇸 美股即時快訊';
  const gradientClass = category === 'tw_trends' 
    ? 'from-indigo-600 to-sky-500' 
    : 'from-emerald-600 to-teal-400';

  /**
   * 智能分頁邏輯 (強化版)
   * 1. 偵測特定 Emoji 章節
   * 2. 嚴格限制單頁行數與字數，避免底部截斷
   */
  const pages = useMemo(() => {
    const lines = summary.split('\n');
    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    let currentChars = 0;

    const sectionMarkers = ['📊', '⚠️', '標的關鍵字'];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      // 觸發分頁條件：
      // - 遇到標題且目前內容已具備一定規模 (內容稍多就分頁)
      // - 或是目前頁面總字數過多 (約 600 字)
      const isNewSection = trimmedLine.startsWith('**') || sectionMarkers.some(m => trimmedLine.startsWith(m));
      const isTooFull = currentChunk.length >= 10 || currentChars > 600;
      
      if ((isNewSection && currentChunk.length >= 6) || isTooFull) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentChars = 0;
      }
      currentChunk.push(line);
      currentChars += line.length;
    });
    
    if (currentChunk.length > 0) chunks.push(currentChunk);

    return chunks.map(c => c.join('\n'));
  }, [summary]);

  const handleDownload = useCallback(async () => {
    if (!containerRef.current) return;
    
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'px', 'a4');
      const pageElements = containerRef.current.querySelectorAll('.report-page');
      
      for (let i = 0; i < pageElements.length; i++) {
        const originalElement = pageElements[i] as HTMLElement;
        
        // --- 核心修復：擴展擷取區域避免裁剪 ---
        const offscreenContainer = document.createElement('div');
        offscreenContainer.style.position = 'absolute';
        offscreenContainer.style.left = '-9999px';
        offscreenContainer.style.top = '0';
        offscreenContainer.style.width = (originalElement.offsetWidth + 40) + 'px'; // 增加寬度緩衝
        offscreenContainer.style.padding = '20px'; // 增加周圍緩衝空間，確保邊框完整
        offscreenContainer.style.backgroundColor = '#ffffff';
        document.body.appendChild(offscreenContainer);

        const clone = originalElement.cloneNode(true) as HTMLElement;
        
        // 強制樣式隔離
        clone.style.backgroundColor = '#ffffff';
        clone.style.color = '#000000';
        clone.style.boxShadow = 'none'; // 導出時移除陰影避免黑邊
        clone.style.margin = '0';
        clone.style.width = originalElement.offsetWidth + 'px';
        
        const allTextElements = clone.querySelectorAll('*');
        allTextElements.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.color = '#000000';
            el.style.opacity = '1';
            el.style.backgroundColor = 'transparent';
            if (el.tagName === 'H2') {
              el.style.background = 'none';
              el.style.webkitTextFillColor = '#000000';
              el.style.color = '#000000';
            }
          }
        });

        offscreenContainer.appendChild(clone);

        // 使用 html-to-image 擷取
        const dataUrl = await htmlToImage.toPng(clone, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          width: originalElement.offsetWidth,   // 精確指定擷取寬度
          height: originalElement.offsetHeight,  // 精確指定擷取高度
        });

        document.body.removeChild(offscreenContainer);

        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        
        // 居中渲染圖片
        const marginX = (pdf.internal.pageSize.getWidth() - pdfWidth) / 2;
        pdf.addImage(dataUrl, 'PNG', marginX, 10, pdfWidth, pdfHeight);
      }

      pdf.save(`${category}_${date.replace(/\//g, '-')}.pdf`);
    } catch (error: any) {
      console.error('PDF generation failed:', error);
      alert('PDF 生成失敗，可能是內容太豐富了，請重試。');
    } finally {
      setIsGenerating(false);
    }
  }, [category, date]);

  return (
    <div className="relative space-y-8">
      {/* 投影片預覽區域 */}
      <div ref={containerRef} className="flex flex-col gap-10">
        {pages.map((content, idx) => (
          <div key={idx} className="report-page-container relative group">
            <article 
              className="report-page rounded-[32px] border border-zinc-200 bg-white p-10 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden transition-colors"
              style={{ minHeight: '580px', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div className="mb-8 flex flex-col gap-4 border-b-2 border-zinc-100 dark:border-zinc-800 pb-6 relative">
                <div className="flex items-center justify-between">
                  <h2 
                    className={`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${gradientClass} tracking-tight`}
                    style={{ WebkitTextFillColor: 'transparent' }}
                  >
                    {title}
                  </h2>
                  
                  {/* 下載按鈕 */}
                  {idx === 0 && (
                    <button
                      onClick={handleDownload}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-white dark:border-t-zinc-900" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      )}
                      <span>{isGenerating ? '正在處理' : 'PDF'}</span>
                    </button>
                  )}

                  <div className="px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 text-[10px] font-black text-zinc-400">
                    PAGE {idx + 1} / {pages.length}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                  <span>{category.replace('_', ' ')}</span>
                  <span>{date}</span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-grow">
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-base font-bold leading-[1.8] text-zinc-950 dark:text-zinc-50 transition-colors">
                    {content}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-10 flex items-center justify-between opacity-30">
                <div className="h-px flex-grow bg-zinc-200 dark:bg-zinc-800 mr-4"></div>
                <span className="text-[9px] font-black tracking-widest text-zinc-400 italic font-sans lowercase">@GLOBAL-INV-INTEL</span>
              </div>
            </article>
          </div>
        ))}
      </div>

      <style jsx>{`
        .report-page {
          background-image: 
            radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0);
          background-size: 24px 24px;
        }
        :global(.dark) .report-page {
          background-image: 
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0);
        }
      `}</style>
    </div>
  );
};

export default ReportCard;
