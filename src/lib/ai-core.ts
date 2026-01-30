import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

// 模型類型定義
export type AIModel = 
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'claude-3-5-sonnet'
  | 'gpt-4o'
  | 'grok-beta'
  | 'gemini-1.5-pro'
  | 'claude-3-haiku'
  | 'gpt-4o-mini'
  | 'gemini-1.5-flash';

// 供應商配置
interface ModelConfig {
  provider: 'openai' | 'google' | 'anthropic' | 'xai';
  modelId: string;
}

const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'gemini-2.0-flash': { provider: 'google', modelId: 'gemini-2.0-flash-exp' },
  'gemini-2.0-flash-lite': { provider: 'google', modelId: 'gemini-2.0-flash-lite-preview-02-05' },
  'claude-3-5-sonnet': { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'grok-beta': { provider: 'xai', modelId: 'grok-beta' },
  'gemini-1.5-pro': { provider: 'google', modelId: 'gemini-1.5-pro' },
  'claude-3-haiku': { provider: 'anthropic', modelId: 'claude-3-haiku-20240307' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
  'gemini-1.5-flash': { provider: 'google', modelId: 'gemini-1.5-flash' },
};

// 最終退讓順序
const MODEL_FALLBACK_ORDER: AIModel[] = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'claude-3-5-sonnet',
  'gpt-4o',
  'grok-beta',
  'gemini-1.5-pro',
  'claude-3-haiku',
  'gpt-4o-mini',
  'gemini-1.5-flash'
];

/**
 * 核心退讓邏輯：遍歷所有模型，失敗則嘗試下一個
 */
export async function generateWithFallback(prompt: string, systemPrompt: string): Promise<string> {
  const platformErrors: Record<string, string> = {};
  let lastError: any = null;

  for (const modelKey of MODEL_FALLBACK_ORDER) {
    const config = MODEL_CONFIGS[modelKey];
    
    // 如果該平台已知失敗且不可重試，可以直接考慮跳過（優化用，目前暫不實作以保證每次都試）
    
    try {
      console.log(`[AI-Core] Attempting ${modelKey} (${config.provider})...`);
      switch (config.provider) {
        case 'openai':
          return await callOpenAI(modelKey, prompt, systemPrompt);
        case 'google':
          return await callGemini(modelKey, prompt);
        case 'anthropic':
          return await callClaude(modelKey, prompt, systemPrompt);
        case 'xai':
          return await callGrok(modelKey, prompt, systemPrompt);
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    } catch (error: any) {
      lastError = error;
      const errorMessage = (error.message || String(error)).toLowerCase();
      
      // 記錄該供應商的最後一個錯誤
      platformErrors[config.provider] = errorMessage;

      // 識別可退讓的錯誤
      const isRetryable = 
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('limit') ||
        errorMessage.includes('400') ||
        errorMessage.includes('404') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('not supported') ||
        errorMessage.includes('balance') ||
        errorMessage.includes('credit') ||
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('missing') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('api key');

      if (isRetryable) {
        console.warn(`[AI-Core] ${modelKey} failed (Retryable): ${errorMessage.slice(0, 100)}... Trying next...`);
        continue;
      } else {
        console.error(`[AI-Core] ${modelKey} failed (NON-Retryable):`, error);
        throw error;
      }
    }
  }

  // 如果全部失敗，整理各平台的診斷資訊
  const diagnosis = Object.entries(platformErrors)
    .map(([p, e]) => `${p.toUpperCase()}: ${e.length > 50 ? e.slice(0, 50) + '...' : e}`)
    .join(' | ');

  throw new Error(`[AI-Core] 全部模型皆失敗。診斷: ${diagnosis}`);
}

/**
 * 輔助函式：檢查金鑰是否有效 (並非佔位符或過短)
 */
function isValidKey(key: string | undefined): boolean {
  return !!key && key !== 'xxx' && key.trim().length > 10;
}

async function callOpenAI(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!isValidKey(apiKey)) throw new Error('Missing or invalid OPENAI_API_KEY');

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
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(isValidKey);
  if (keys.length === 0) throw new Error('Missing or invalid GEMINI_API_KEY');

  let lastError: any = null;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as string;
    try {
      const genAI = new GoogleGenerativeAI(key);
      const genModel = genAI.getGenerativeModel({ model: MODEL_CONFIGS[model].modelId });
      
      const result = await genModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      lastError = error;
      const errorMessage = (error.message || String(error)).toLowerCase();
      
      // 金鑰層級的可重試錯誤 (429, 401, 403, 404 等)
      const isRetryableKeyError = 
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('limit') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404') || // 某些情況下 Key 權限不足會回傳 404
        errorMessage.includes('authentication') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('api key');

      if (isRetryableKeyError && i < keys.length - 1) {
        console.warn(`[AI-Core] Gemini Key ${i + 1} failed. Trying Key ${i + 2}...`);
        continue;
      }
      throw error; // 向上拋給 generateWithFallback 決定是否換 MODEL
    }
  }
  throw lastError;
}

async function callClaude(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!isValidKey(apiKey)) throw new Error('Missing or invalid ANTHROPIC_API_KEY');

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: MODEL_CONFIGS[model].modelId,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  });

  const content = response.content[0];
  return (content.type === 'text') ? content.text : '';
}

async function callGrok(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!isValidKey(apiKey)) throw new Error('Missing or invalid GROK_API_KEY');

  const xai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.x.ai/v1',
  });

  const response = await xai.chat.completions.create({
    model: MODEL_CONFIGS[model].modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content || '';
}
