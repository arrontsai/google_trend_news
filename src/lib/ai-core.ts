import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI 模型類型定義 (2026 最新版)
 */
export type AIModel = 
  | 'gemini-3-flash'        // 2026 最新最強 Flash 模型 (Preview)
  | 'gemini-3-pro'          // 2026 最新最強 Pro 模型 (Preview)
  | 'gemini-2.0-flash-lite' // GA 版: 高額度, 極速
  | 'gemini-2.0-flash'      // GA 版: 穩定
  | 'claude-3-5-sonnet'     
  | 'gpt-4o'                
  | 'grok-beta'             
  | 'gemini-1.5-pro'        
  | 'claude-3-haiku'        
  | 'gpt-4o-mini'           
  | 'gemini-1.5-flash';

/**
 * 供應商配置與正式模型 ID
 */
interface ModelConfig {
  provider: 'openai' | 'google' | 'anthropic' | 'xai';
  modelId: string;
}

const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'gemini-3-flash': { provider: 'google', modelId: 'gemini-3-flash-preview' },
  'gemini-3-pro': { provider: 'google', modelId: 'gemini-3-pro-preview' },
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
 * 最終退讓順序：以「最新架構、最優額度」為優先
 */
const MODEL_FALLBACK_ORDER: AIModel[] = [
  'gemini-3-flash',        // 第一位：最新架構
  'gemini-2.0-flash-lite', // 第二位：高額度 (1000 RPD)
  'gemini-2.0-flash',      // 第三位
  'gemini-3-pro',          // 第四位
  'claude-3-5-sonnet',     // 第五位
  'gpt-4o',                // 第六位
  'grok-beta',             // 第七位
  'gemini-1.5-pro',        
  'claude-3-haiku',        
  'gpt-4o-mini',           
  'gemini-1.5-flash'
];

/**
 * 輔助函式：金鑰有效性檢查
 */
function isValidKey(key: string | undefined): boolean {
  return !!key && key !== 'xxx' && key.trim().length > 10;
}

/**
 * 核心退讓邏輯
 */
export async function generateWithFallback(prompt: string, systemPrompt: string): Promise<string> {
  const platformErrors: Record<string, string[]> = {};
  
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
      const errorMessage = (error.message || String(error)).trim();
      
      // 收集錯誤細節
      if (!platformErrors[config.provider]) platformErrors[config.provider] = [];
      platformErrors[config.provider].push(`[${modelKey}] ${errorMessage}`);

      // 判斷是否足以致命 (不應該繼續嘗試下一個模型)
      // 這裡採取寬鬆策略：只要不是程式碼邏輯出錯，儘量往後退讓
      console.warn(`[AI-Core] ${modelKey} failed: ${errorMessage.slice(0, 100)}...`);
      continue;
    }
  }

  // 全部失敗：生成更精細的診斷報告
  const diagnosis = Object.entries(platformErrors)
    .map(([p, errs]) => {
      // 每個平台只取最具代表性的最後一個錯誤
      const lastErr = errs[errs.length - 1];
      return `${p.toUpperCase()}: ${lastErr.slice(0, 60)}...`;
    })
    .join(' | ');

  throw new Error(`[AI-Core] 全部模型嘗試完畢皆失敗。詳細診斷: ${diagnosis}`);
}

async function callOpenAI(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!isValidKey(apiKey)) throw new Error('Invalid OpenAI Key');

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: MODEL_CONFIGS[model].modelId,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
    temperature: 0.7,
  });
  return response.choices[0].message.content || '';
}

/**
 * Gemini 特殊調度：無差別徹底嘗試所有可用金鑰
 */
async function callGemini(model: AIModel, prompt: string): Promise<string> {
  // 找出所有可能的金鑰名稱
  const keyList = [
    { name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY },
    { name: 'GEMINI_API_KEY_2', value: process.env.GEMINI_API_KEY_2 }
  ].filter(k => isValidKey(k.value));

  if (keyList.length === 0) throw new Error('No valid Gemini API Keys found in config');

  let keyErrors: string[] = [];
  
  for (const keyItem of keyList) {
    try {
      console.log(`[AI-Core] Trying ${model} with ${keyItem.name}...`);
      const genAI = new GoogleGenerativeAI(keyItem.value as string);
      const genModel = genAI.getGenerativeModel({ model: MODEL_CONFIGS[model].modelId });
      
      const result = await genModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      const msg = (error.message || String(error)).toLowerCase();
      console.warn(`[AI-Core] ${keyItem.name} failed for ${model}: ${msg.slice(0, 50)}`);
      keyErrors.push(`${keyItem.name}: ${msg}`);
      
      // 無論什麼錯誤 (429, 401, 404, 甚至 location not supported)，只要還有下一個 Key 就試
      continue; 
    }
  }
  
  // 走到這裡代表所有 Key 都試過了
  throw new Error(`All Gemini keys failed. [${keyErrors.map(e => e.slice(0, 30)).join('; ')}]`);
}

async function callClaude(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!isValidKey(apiKey)) throw new Error('Invalid Anthropic Key');

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: MODEL_CONFIGS[model].modelId,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });
  const content = response.content[0];
  return (content.type === 'text') ? content.text : '';
}

async function callGrok(model: AIModel, prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!isValidKey(apiKey)) throw new Error('Invalid Grok Key');

  const xai = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
  const response = await xai.chat.completions.create({
    model: MODEL_CONFIGS[model].modelId,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
    temperature: 0.7,
  });
  return response.choices[0].message.content || '';
}
