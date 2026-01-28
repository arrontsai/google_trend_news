import Parser from 'rss-parser';

const parser = new Parser();
const GEO = 'TW';
const TRENDS_URL = `https://trends.google.com.tw/trending/rss?geo=${GEO}`;

export interface TrendItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  traffic?: string; // approximate traffic from description if parseable
}

export async function fetchGoogleTrends(): Promise<TrendItem[]> {
  try {
    const feed = await parser.parseURL(TRENDS_URL);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.contentSnippet || item.content || '',
      // Note: Google Trends RSS doesn't explicitly expose traffic in a standard field often, 
      // but sometimes it's in the description. For now we just return basic info.
    }));
  } catch (error) {
    console.error('Error fetching Google Trends:', error);
    throw error;
  }
}
