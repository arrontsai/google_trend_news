import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 模型定義
export type AIModel = 
  | 'gpt-4o' 
  | 'gemini-1.5-pro' 
  | 'gpt-4o-mini' 
  | 'gemini-1.5-flash';

// 配置介面
interface ModelConfig {
  provider: 'openai' | 'google';
  modelId: string;
}

const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'gemini-1.5-pro': { provider: 'google', modelId: 'gemini-1.5-pro' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
  'gemini-1.5-flash': { provider: 'google', modelId: 'gemini-1.5-flash' },
};

// 優先順序
const MODEL_FALLBACK_ORDER: AIModel[] = [
  'gpt-4o',
  'gemini-1.5-pro',
  'gpt-4o-mini',
  'gemini-1.5-flash'
];

export async function generateWithFallback(prompt: string, systemPrompt: string): Promise<string> {
  let lastError: any = null;

  for (const modelKey of MODEL_FALLBACK_ORDER) {
    const config = MODEL_CONFIGS[modelKey];
    console.log(`[AI-Service] Attempting generation with ${modelKey}...`);

    try {
      if (config.provider === 'openai') {
        return await callOpenAI(modelKey, prompt, systemPrompt);
      } else {
        return await callGemini(modelKey, prompt);
      }
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || String(error);
      
      // 識別可退讓的錯誤 (Quota 429, Server Error 500, Key Missing等)
      if (
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('limit') ||
        errorMessage.includes('500') ||
        errorMessage.includes('503') ||
        errorMessage.includes('Missing')
      ) {
        console.warn(`[AI-Service] ${modelKey} failed (Retryable): ${errorMessage}. Trying next model...`);
        continue;
      } else {
        // 其他非預期錯誤直接拋出
        console.error(`[AI-Service] ${modelKey} failed (NON-Retryable):`, error);
        throw error;
      }
    }
  }

  throw new Error(`所有 AI 模型皆嘗試失敗。最後一個錯誤: ${lastError?.message || '未知'}`);
}

async function callOpenAI(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: MODEL_CONFIGS[model].modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content || '';
}

async function callGemini(model: AIModel, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  // 注意：Gemini 1.5 系列的模型 ID 通常與 config 中的 modelId 一致
  const genModel = genAI.getGenerativeModel({ model: MODEL_CONFIGS[model].modelId });
  
  const result = await genModel.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
