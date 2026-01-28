import { summarizeWithOpenAI } from './openai';
import { summarizeWithGemini } from './gemini';
import { TrendItem } from './trends';

export async function summarizeTrends(trends: TrendItem[]): Promise<string> {
  console.log('Attempting to generate summary with OpenAI...');
  try {
    return await summarizeWithOpenAI(trends);
  } catch (error: any) {
    // Check if it's a quota error (429) or any other failure
    console.warn(`OpenAI failed: ${error.message || error}`);
    console.log('Falling back to Google Gemini...');
    
    try {
      return await summarizeWithGemini(trends);
    } catch (geminiError: any) {
      console.error(`Gemini also failed: ${geminiError.message || geminiError}`);
      throw new Error('Both OpenAI and Gemini failed to generate summary.');
    }
  }
}
