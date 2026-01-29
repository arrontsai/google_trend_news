import { GoogleGenerativeAI } from '@google/generative-ai';
import { TrendItem } from './trends';
import { StockNewsItem } from './us-stocks';

export async function summarizeWithGemini(trends: TrendItem[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  if (trends.length === 0) return 'No trends found today.';

  const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  const trendList = trends.slice(0, 30).map((t, i) => `${i + 1}. [來源: ${t.source}] ${t.title}`).join('\n');
  const topKeywords = trends.slice(0, 5).map(t => t.title).join(' | ');

  const prompt = `
    今天是 ${todayStr}，你是專業的「台股晨報分析師」。請根據以下資料撰寫一份「極簡、乾貨、具洞察力」的台股重點整理。

    資料來源摘要：
    ${trendList}

    撰寫要求：
    1. 內容必須「極度精簡」，避免廢話。
    2. 強調「產能、訂單、盤前盤後動向、大漲大跌原因」、「法說會關鍵字」與「PTT 散戶情緒」。
    3. 格式必須嚴格如下：

    今天是 ${todayStr}，這是您的台股重點整理：

    📌 今日重點（150字內精華）
    (精煉內容)

    🌏 國際與外電觀點
    (精煉內容)

    🏭 產業與社群熱議 (PTT/Threads)
    (精煉內容)

    📊 法人動向與資金
    (精煉內容)

    ⚠️ 風險提醒
    (一句話或短語)

    標的關鍵字：(格式：公司名(代碼): 摘要 | 用 | 分隔。代碼請包含台股四位數字或美股代號)
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating summary with Gemini:', error);
    throw error;
  }
}

export async function summarizeUSStocksWithGemini(news: StockNewsItem[], marketContext?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  if (news.length === 0) return '目前沒有最新的美股新聞。';

  const newsList = news.map((n, i) => `${i + 1}. [${n.source}] ${n.headline}: ${n.summary}`).join('\n\n');
  const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const prompt = `
    今天是 ${todayStr}，你是專業的華爾街金融分析師。請根據以下美股即時新聞與市場背景，撰寫一份對齊台股格式的「美股即時快訊」。
    
    【最新美股新聞列表】：
    ${newsList}
    
    ${marketContext ? `【市場分析與政經背景（專家觀點/Fed/總統/分析報告）】：\n${marketContext}` : ''}

    撰寫要求：
    1. 使用繁體中文（內容可夾雜英文原名），語氣應專業、精簡且術語符合台灣習慣。
    2. 格式必須嚴格對齊台股如下：

    今天是 ${todayStr}，這是您的美股重點整理：

    📌 今日重點（150字內精華）
    (精煉內容，點出市場核心動能)

    🌏 國際與政經脈動
    (精煉內容，包含 Fed、總統講話或宏觀分析)

    🏭 專家觀點與社群熱議
    (整合專家如 Elon Musk 觀點或社群熱門討論)

    📊 市場動態與資金
    (分析重要個股漲跌原因與資金流向)

    ⚠️ 風險提醒
    (一句話或短語)

    標的關鍵字：(格式：公司名(代碼): 摘要 | 用 | 分隔)
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating US stock summary with Gemini:', error);
    throw error;
  }
}
