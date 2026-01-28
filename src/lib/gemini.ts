import { GoogleGenerativeAI } from '@google/generative-ai';
import { TrendItem } from './trends';

export async function summarizeWithGemini(trends: TrendItem[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  if (trends.length === 0) return 'No trends found today.';

  const trendList = trends.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}: ${(t.description || '').slice(0, 300)}`).join('\n');
  const trendTitles = trends.slice(0, 10).map(t => t.title).join(' # ');
  const prompt = `
    你是專業的「台股晨報分析師」。請根據以下【新聞資料】（來自 Google Trends 商業熱搜），撰寫一份針對投資者的「台股早安晨報」。

    【新聞資料】：
    ${trendList}

    請產出一份「台股早安晨報」，格式必須完全如下：

    📌 今日重點（3 行內）
    (這裡填寫重點內容)

    🌏 國際影響
    (這裡根據資料分析國際情勢)

    🏭 產業與族群
    (這裡分析受影響的產業)

    📊 法人與資金解讀
    (這裡分析可能的資金動向)

    ⚠️ 今日風險提醒
    (這裡提醒投資風險)

    ---
    # ${trendTitles}
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
