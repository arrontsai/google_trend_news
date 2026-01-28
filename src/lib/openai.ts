import OpenAI from 'openai';
import { TrendItem } from './trends';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY');
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export async function summarizeWithOpenAI(trends: TrendItem[]): Promise<string> {
  if (trends.length === 0) return 'No trends found today.';

  // Construct a prompt with source attribution
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: [
        { role: 'system', content: '你是一位專業台股晨報分析師。請用專業、簡潔且具洞察力的口吻撰寫。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7, 
    });

    return response.choices[0].message.content || 'Failed to generate summary.';
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    throw error;
  }
}
