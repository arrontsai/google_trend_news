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
  const colorHex = category === 'tw_trends' ? '#4f46e5' : '#059669';

  // 將內容拆分為「頁面/投影片」
  // 規則：依據標題 (例如 **標題**) 或 ### 做切分
  const pages = useMemo(() => {
    // 簡單的切分邏輯：找尋 **開頭的行，或是內容過長時切分
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
            color: '#000000',
            fontFamily: 'sans-serif',
            opacity: '1',
          },
          filter: (node) => {
            // 確保所有文字節點在擷取時都是黑色的
            if (node instanceof HTMLElement) {
              node.style.color = '#000000';
              node.style.opacity = '1';
            }
            return true;
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
    <div className="space-y-6">
      {/* 投影片預覽區域 */}
      <div ref={containerRef} className="flex flex-col gap-8">
        {pages.map((content, idx) => (
          <div key={idx} className="report-page-container relative group">
            <article 
              className="report-page rounded-[32px] border border-zinc-200 bg-white p-10 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 transition-transform active:scale-[0.99]"
              style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div className="mb-8 flex flex-col gap-4 border-b-2 border-zinc-50 pb-6 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h2 className={`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${gradientClass} tracking-tight`}>
                    {title}
                  </h2>
                  <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500">
                    PAGE {idx + 1} / {pages.length}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                  <span>{category.replace('_', ' ')}</span>
                  <span>{date}</span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-grow">
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-[15px] font-semibold leading-[1.8] text-zinc-950 dark:text-zinc-100">
                    {content}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-10 flex items-center justify-between opacity-40">
                <div className="h-0.5 flex-grow bg-zinc-100 dark:bg-zinc-800 mr-4"></div>
                <span className="text-[10px] font-bold tracking-tighter italic">Global Investment Intel</span>
              </div>
            </article>
          </div>
        ))}
      </div>

      {/* Floating Action Button for Download */}
      <div className="sticky bottom-6 z-20">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-zinc-900 px-6 py-5 text-lg font-black text-white shadow-2xl transition-all hover:bg-black active:scale-[0.97] disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isGenerating ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-3 border-zinc-400 border-t-white dark:border-zinc-500 dark:border-t-black" />
              <span>正在封裝報表 PDF...</span>
            </>
          ) : (
            <>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-white/40 transition-all opacity-0 group-hover:opacity-100"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rotate-0 group-hover:-rotate-12 transition-transform">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>立即下載專業多頁 PDF</span>
              <span className="ml-2 text-[10px] opacity-40 font-mono">SOCIAL SHARE SIZE</span>
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .report-page {
          background-image: 
            radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0);
          background-size: 24px 24px;
        }
        :global(.dark) .report-page {
          background-image: 
            radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0);
        }
      `}</style>
    </div>
  );
};

export default ReportCard;
