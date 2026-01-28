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

  const trendList = trends.slice(0, 30).map((t, i) => `${i + 1}. [來源: ${t.source}] ${t.title}: ${(t.description || '').slice(0, 200)}`).join('\n');
  const trendTitles = trends.slice(0, 15).map(t => t.title).join(' # ');
  const prompt = `
    你是專業的「台股晨報分析師」。請根據以下【新聞與社群資料】（整合自 Google Trends、PTT Stock、Google News 財經），撰寫一份深度台股早安晨報。

    【新聞與社群資料】：
    ${trendList}

    請針對以上資料，特別留意「法說會資訊」、「散戶情緒」、「國際外電」與「聰明錢動向」，產出一份晨報。
    格式必須完全如下：

    📌 今日重點（3 行內，擷取最具影響力的 1-2 則消息）
    (這裡填寫內容)

    🌏 國際影響 & 外電摘要
    (這裡結合資料分析國際情勢與外電觀點)

    🏭 產業、族群與社群熱議
    (這裡分析受影響的產業以及 PTT/Threads 上的討論焦點)

    📊 法人與資金解讀
    (這裡分析可能的法人動向與市場情緒)

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
