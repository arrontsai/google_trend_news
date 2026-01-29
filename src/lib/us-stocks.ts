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
      throw fallbackError;
    }
  }
}
