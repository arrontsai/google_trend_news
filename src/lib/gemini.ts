import { StockNewsItem } from './us-stocks';
import { generateWithFallback } from './ai-core';

/**
 * 針對美股新聞進行摘要生成，並實作 Token 優化策略。
 * 1. 限制新聞筆數為 12 筆。
 * 2. 針對每則新聞的摘要內容實施 200 字強制截斷。
 */
export async function summarizeUSStocksWithGemini(news: StockNewsItem[], marketContext?: string): Promise<string> {
  if (news.length === 0) return '目前沒有最新的美股新聞。';

  // Token 優化：僅取前 12 筆，且對摘要內容進行截斷
  const optimizedNewsList = news.slice(0, 12).map((n, i) => {
    const truncatedSummary = n.summary && n.summary.length > 200 
      ? n.summary.substring(0, 200) + '...' 
      : n.summary;
    return `${i + 1}. [${n.source}] ${n.headline}: ${truncatedSummary}`;
  }).join('\n\n');

  const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const systemPrompt = '你是一位專業的華爾街金融分析師。請用專業、簡潔且術語符合台灣習慣的口吻撰寫。';
  const prompt = `
    今天是 ${todayStr}，你是專業的華爾街金融分析師。請根據以下美股即時新聞與市場背景，撰寫一份對齊台股格式的「美股即時快訊」。
    
    【最新美股新聞列表】：
    ${optimizedNewsList}
    
    ${marketContext ? `【市場分析與政經背景】：\n${marketContext}` : ''}

    撰寫要求：
    1. 使用繁體中文，格式嚴格對齊如下：

    今天是 ${todayStr}，這是您的美股重點整理：

    📌 今日重點（150字內精華）
    (精煉內容)

    🌏 國際與政經脈動
    (精煉內容)

    🏭 專家觀點與社群熱議
    (精煉內容)

    📊 市場動態與資金
    (詳細分析重要個股漲跌原因、資金流向)

    ⚠️ 風險提醒
    (一句話或短語，必須包含)

    標的關鍵字：(格式：公司名(代碼): 摘要 | 用 | 分隔)
  `;

  return await generateWithFallback(prompt, systemPrompt);
}
