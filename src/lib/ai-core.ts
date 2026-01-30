import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI 模型類型定義 (2026 最新穩定版)
 */
export type AIModel = 
  | 'gemini-2.0-flash-lite' // GA 版: 高額度 (1000 RPD), 首選
  | 'gemini-2.0-flash'      // GA 版: 性能均衡
  | 'claude-3-5-sonnet'     // 旗艦級推理
  | 'gpt-4o'                // OpenAI 旗艦
  | 'grok-beta'             // xAI 備援
  | 'gemini-1.5-pro'        // 經典高階
  | 'claude-3-haiku'        // 極速模型
  | 'gpt-4o-mini'           // 成本模型
  | 'gemini-1.5-flash';      // 最終保底

/**
 * 供應商配置與正式模型 ID
 */
interface ModelConfig {
  provider: 'openai' | 'google' | 'anthropic' | 'xai';
  modelId: string;
}

const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'gemini-2.0-flash-lite': { provider: 'google', modelId: 'gemini-2.0-flash-lite' },
  'gemini-2.0-flash': { provider: 'google', modelId: 'gemini-2.0-flash' },
  'claude-3-5-sonnet': { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'grok-beta': { provider: 'xai', modelId: 'grok-beta' },
  'gemini-1.5-pro': { provider: 'google', modelId: 'gemini-1.5-pro' },
  'claude-3-haiku': { provider: 'anthropic', modelId: 'claude-3-haiku-20240307' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
  'gemini-1.5-flash': { provider: 'google', modelId: 'gemini-1.5-flash' },
};

/**
 * 最終退讓順序：以「有額度、速度快、品質穩」為優先
 */
const MODEL_FALLBACK_ORDER: AIModel[] = [
  'gemini-2.0-flash-lite', // 第一位：15 RPM / 1000 RPD 額度最慷慨
  'gemini-2.0-flash',      // 第二位：速度與品質兼優
  'claude-3-5-sonnet',     // 第三位：高品質推理
  'gpt-4o',                // 第四位
  'grok-beta',             // 第五位
  'gemini-1.5-pro',        // 第六位
  'claude-3-haiku',        // 第七位
  'gpt-4o-mini',           // 第八位
  'gemini-1.5-flash'       // 最後保底
];

/**
 * 輔助函式：檢查金鑰是否有效 (並非佔位符或過短)
 */
function isValidKey(key: string | undefined): boolean {
  // 排除 xxx、垃圾字串或過短的金鑰
  return !!key && key !== 'xxx' && key.trim().length > 15;
}

/**
 * 核心退讓邏輯：遍歷所有模型，失敗則嘗試下一個
 */
export async function generateWithFallback(prompt: string, systemPrompt: string): Promise<string> {
  const platformErrors: Record<string, string> = {};
  let lastError: any = null;

  for (const modelKey of MODEL_FALLBACK_ORDER) {
    const config = MODEL_CONFIGS[modelKey];
    
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
      platformErrors[config.provider] = errorMessage;

      // 判斷是否為「可退讓/可跳過」的錯誤
      const isRetryable = 
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('limit') ||
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('not supported') ||
        errorMessage.includes('balance') ||
        errorMessage.includes('credit') ||
        errorMessage.includes('missing') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('api key');

      if (isRetryable) {
        console.warn(`[AI-Core] ${modelKey} failed (Retryable): ${errorMessage.slice(0, 80)}... Trying next...`);
        continue;
      } else {
        console.error(`[AI-Core] ${modelKey} failed (NON-Retryable):`, error);
        throw error;
      }
    }
  }

  // 全部失敗後整理診斷資訊供 UI 顯示
  const diagnosis = Object.entries(platformErrors)
    .map(([p, e]) => `${p.toUpperCase()}: ${e.length > 40 ? e.slice(0, 40) + '...' : e}`)
    .join(' | ');

  throw new Error(`[AI-Core] 全部模型皆失敗。診斷: ${diagnosis}`);
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
  if (keys.length === 0) throw new Error('Missing or invalid GEMINI_API_KEY (No working key found)');

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
      
      const isRetryableKeyError = 
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('limit') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('api key');

      if (isRetryableKeyError && i < keys.length - 1) {
        console.warn(`[AI-Core] Gemini Key ${i + 1} failed. Trying Key ${i + 2}...`);
        continue;
      }
      throw error; 
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
