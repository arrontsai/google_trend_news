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

  // 將內容拆分為「頁面/投影片」
  const pages = useMemo(() => {
    const lines = summary.split('\n');
    const chunks: string[][] = [];
    let currentChunk: string[] = [];

    lines.forEach((line) => {
      // 如果遇到雙星號標題且當前 chunk 已有內容，則另開一頁
      if (line.trim().startsWith('**') && currentChunk.length > 5) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
      currentChunk.push(line);
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
        const element = pageElements[i] as HTMLElement;
        
        const dataUrl = await htmlToImage.toPng(element, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          style: {
            // 強制使用基礎 RGB 顏色，避免瀏覽器將其轉為 lab() 或 oklch()
            color: '#000000',
            fontFamily: 'Arial, sans-serif',
          }
        });

        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`${category}_${date.replace(/\//g, '-')}.pdf`);
    } catch (error: any) {
      console.error('PDF generation failed:', error);
      alert('PDF 生成失敗，請再試一次。');
    } finally {
      setIsGenerating(false);
    }
  }, [category, date]);

  return (
    <div className="relative space-y-6">
      {/* 投影片預覽區域 */}
      <div ref={containerRef} className="flex flex-col gap-8">
        {pages.map((content, idx) => (
          <div key={idx} className="report-page-container relative group">
            <article 
              className="report-page rounded-[32px] border border-zinc-200 bg-white p-10 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
              style={{ minHeight: '550px', display: 'flex', flexDirection: 'column' }}
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
                  
                  {/* 下載按鈕 - 放在右上角，小小的 */}
                  {idx === 0 && (
                    <button
                      onClick={handleDownload}
                      disabled={isGenerating}
                      title="下載 PDF 報表"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-[10px] font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-white dark:border-t-black" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      )}
                      <span>{isGenerating ? '生成中' : 'PDF'}</span>
                    </button>
                  )}

                  {idx > 0 && (
                    <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500">
                      PAGE {idx + 1} / {pages.length}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
                  <span>{category.replace('_', ' ')}</span>
                  <span>{date}</span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-grow">
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <pre 
                    className="whitespace-pre-wrap font-sans text-[15px] font-bold leading-[1.8]"
                    style={{ color: '#000000' }} // 硬編碼 HEX 避免 lab() 轉換，CSS 變數會有問題
                  >
                    {content}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-10 flex items-center justify-between opacity-30">
                <div className="h-px flex-grow bg-zinc-200 dark:bg-zinc-800 mr-4"></div>
                <span className="text-[9px] font-black tracking-widest italic text-zinc-400">GLOBAL INTEL</span>
              </div>
            </article>
          </div>
        ))}
      </div>

      <style jsx>{`
        .report-page {
          background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0);
          background-size: 20px 20px;
        }
        :global(.dark) .report-page {
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0);
          color: white; /* 網頁端顯示 */
        }
        pre {
          /* 確保在網頁端閱讀時暗色模式正常，但 style 中已強制黑字用於 PDF */
          color: inherit;
        }
        :global(.dark) pre {
          color: #f4f4f5 !important; /* 僅網頁端顯示 */
        }
      `}</style>
    </div>
  );
};

export default ReportCard;
