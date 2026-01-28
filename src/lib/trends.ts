import Parser from 'rss-parser';

const parser = new Parser();
const GEO = 'TW';
const PTT_STOCK_RSS = 'http://rss.ptt.cc/Stock.xml';
const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search?q=%E5%8F%B0%E8%82%A1+%E7%94%A2%E6%A5%AD+%E8%82%A1%E5%B8%82&hl=zh-TW&gl=TW&ceid=TW:zh-Hant';

export interface TrendItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  source?: string;
}

const TRENDS_URL = `https://trends.google.com.tw/trending/rss?geo=${GEO}&cat=b`;

export async function fetchGoogleTrends(): Promise<TrendItem[]> {
  try {
    const feed = await parser.parseURL(TRENDS_URL);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.contentSnippet || item.content || '',
      source: 'Google Trends'
    }));
  } catch (error) {
    console.error('Error fetching Google Trends:', error);
    return [];
  }
}

export async function fetchPTTTrends(): Promise<TrendItem[]> {
  try {
    const feed = await parser.parseURL(PTT_STOCK_RSS);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.contentSnippet || item.content || '',
      source: 'PTT Stock'
    }));
  } catch (error) {
    console.error('Error fetching PTT Trends:', error);
    return [];
  }
}

export async function fetchGoogleNewsTrends(): Promise<TrendItem[]> {
  try {
    const feed = await parser.parseURL(GOOGLE_NEWS_RSS);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.contentSnippet || item.content || '',
      source: 'Google News'
    }));
  } catch (error) {
    console.error('Error fetching Google News Trends:', error);
    return [];
  }
}

export async function fetchAllTrends(): Promise<TrendItem[]> {
  const [google, ptt, news] = await Promise.all([
    fetchGoogleTrends(),
    fetchPTTTrends(),
    fetchGoogleNewsTrends()
  ]);

  return [...google, ...ptt, ...news];
}
