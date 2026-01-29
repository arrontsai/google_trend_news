import { TrendItem } from './trends';
import { generateWithFallback } from './ai-core';

export async function summarizeTrends(trends: TrendItem[]): Promise<string> {
  if (trends.length === 0) return 'No trends found today.';

  const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  const trendList = trends.slice(0, 30).map((t, i) => `${i + 1}. [來源: ${t.source}] ${t.title}`).join('\n');

  const systemPrompt = '你是一位專業台股晨報分析師。請用專業、簡潔且具洞察力的口吻撰寫。';
  const prompt = `
    今天是 ${todayStr}，你是專業的「台股晨報分析師」。請根據以下資料撰寫一份「極簡、乾貨、具洞察力」的台股重點整理。

    資料來源摘要：
    ${trendList}

    撰寫要求：
    1. 內容必須「極度精簡」，避免廢話。
    2. 強調「產能、訂單、盤前盤後動向、大漲大跌原因」、「法說會關鍵字」與「PTT 散戶情緒」。
    3. 格式必須嚴格如下：

    今天是 ${todayStr}，這是您的台股重點整理：

    📌 今日重點（150字內精華）
    (精煉內容)

    🌏 國際與外電觀點
    (精煉內容)

    🏭 產業與社群熱議 (PTT/Threads)
    (精煉內容)

    📊 法人動向與資金
    (精煉內容)

    ⚠️ 風險提醒
    (一句話或短語)

    標的關鍵字：(格式：公司名(代碼): 摘要 | 用 | 分隔。代碼請包含台股四位數字或美股代號)
  `;

  return await generateWithFallback(prompt, systemPrompt);
}
