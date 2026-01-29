import { summarizeWithGemini } from './gemini';
import { TrendItem } from './trends';

export async function summarizeTrends(trends: TrendItem[]): Promise<string> {
  console.log('Generating summary with Google Gemini...');
  
  try {
    return await summarizeWithGemini(trends);
  } catch (error: any) {
    console.error(`Gemini summarization failed: ${error.message || error}`);
    throw new Error(`AI 生成摘要失敗: ${error.message || '請檢查 API 金鑰與配額'}`);
  }
}
