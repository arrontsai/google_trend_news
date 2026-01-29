export interface StockNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function fetchUSStockNews(): Promise<StockNewsItem[]> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.statusText}`);
    }

    const data: StockNewsItem[] = await response.json();
    return data.slice(0, 15);
  } catch (error) {
    console.error('Error fetching US stock news from Finnhub, switching to Yahoo Finance:', error);
    
    // Fallback to Yahoo Finance RSS via rss-parser
    try {
      const Parser = require('rss-parser');
      const parser = new Parser();
      const feed = await parser.parseURL('https://finance.yahoo.com/news/rssindex');
      
      return feed.items.map((item: any, i: number) => ({
        category: 'general',
        datetime: item.pubDate ? new Date(item.pubDate).getTime() / 1000 : Date.now() / 1000,
        headline: item.title || '',
        id: i,
        image: '',
        related: '',
        source: 'Yahoo Finance',
        summary: item.contentSnippet || item.content || '',
        url: item.link || ''
      })).slice(0, 15);
    } catch (fallbackError) {
      console.error('Yahoo Finance fallback also failed:', fallbackError);
      return [];
    }
  }
}

/**
 * 獲取更廣泛的市場背景資訊（專家觀點、分析報告、政經談話）
 * 註：在 Vercel 環境中，我們可以使用搜尋 API (如 Brave Search 或 Google Search)
 * 這裡我們先定義介面與模擬邏輯，實際執行時會併入 Gemini Context
 */
export async function fetchMarketContext(): Promise<string> {
  // 這些關鍵字可以幫助捕捉使用者感興趣的深層資訊
  const queries = [
    "latest US stock market analysis Morningstar Seeking Alpha",
    "Elon Musk latest financial tweets and Tesla xAI news",
    "Federal Reserve Jerome Powell press conference highlights today",
    "US President economic policy announcements last 24 hours"
  ];
  
  // 預期回傳一段整合後的背景文字
  // 在實際 Agent 執行流程中，這部分可以由搜尋工具補足
  return "市場分析師（Morningstar）指出美股估值接近公允價值。聯準會維持利率不變但暗示政策獨立性。特斯拉宣布對 xAI 進行大規模投資。美國總統強調經濟強勁增長但消費者信心仍待提升。";
}

