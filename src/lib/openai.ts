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

  // Construct a prompt
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
