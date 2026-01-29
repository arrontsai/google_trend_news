import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

// 模型類型定義
export type AIModel = 
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
  'claude-3-5-sonnet': { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'grok-beta': { provider: 'xai', modelId: 'grok-beta' },
  'gemini-1.5-pro': { provider: 'google', modelId: 'gemini-1.5-pro-latest' },
  'claude-3-haiku': { provider: 'anthropic', modelId: 'claude-3-haiku-20240307' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
  'gemini-1.5-flash': { provider: 'google', modelId: 'gemini-1.5-flash-latest' },
};

// 最終退讓順序
const MODEL_FALLBACK_ORDER: AIModel[] = [
  'claude-3-5-sonnet',
  'gpt-4o',
  'grok-beta',
  'gemini-1.5-pro',
  'claude-3-haiku',
  'gpt-4o-mini',
  'gemini-1.5-flash'
];

export async function generateWithFallback(prompt: string, systemPrompt: string): Promise<string> {
  let lastError: any = null;

  for (const modelKey of MODEL_FALLBACK_ORDER) {
    const config = MODEL_CONFIGS[modelKey];
    console.log(`[AI-Core] Attempting ${modelKey} (${config.provider})...`);

    try {
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
      
      // 識別可退讓的錯誤 (Quota 429, Server Error 50x, Key Missing, 餘額不足 400, 模型未找到 404 等)
      if (
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('limit') ||
        errorMessage.includes('400') ||
        errorMessage.includes('404') || // 新增：捕捉 404 Not Found
        errorMessage.includes('not found') || // 新增：捕捉模型未找到
        errorMessage.includes('not supported') || // 新增：捕捉不支援的方法
        errorMessage.includes('balance') ||
        errorMessage.includes('credit') ||
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('missing') ||
        errorMessage.includes('authentication')
      ) {
        console.warn(`[AI-Core] ${modelKey} failed (Retryable): ${errorMessage}. Trying next model...`);
        continue;
      } else {
        console.error(`[AI-Core] ${modelKey} failed (NON-Retryable):`, error);
        throw error;
      }
    }
  }

  throw new Error(`[AI-Core] 所有平台模型皆已嘗試但失敗。最後錯誤: ${lastError?.message || '未知'}`);
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
  const genModel = genAI.getGenerativeModel({ model: MODEL_CONFIGS[model].modelId });
  
  const result = await genModel.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

async function callClaude(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

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
  if (content.type === 'text') {
    return content.text;
  }
  return '';
}

async function callGrok(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error('Missing GROK_API_KEY');

  // Grok API 使用 OpenAI 相容格式
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
