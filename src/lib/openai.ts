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
  const prompt = `
    你是專業的新聞編輯。請根據以下台灣 Google Trends 熱門關鍵字，撰寫一份簡潔的每日摘要報告。
    
    格式要求：
    1. 用繁體中文。
    2. 開頭請寫「早安！今天的熱門話題有：」。
    3. 列出前 5-8 個最重要的新聞點，每個點用 emoji 開頭。
    4. 最後做一個幽默或正向的結語。
    5. 不要直接列出所有輸入的文字，要消化整理。

    資料來源：
    ${trendList}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: [
        { role: 'system', content: 'You are a professional news editor specializing in Taiwanese trends.' },
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
