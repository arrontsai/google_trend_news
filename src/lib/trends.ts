import Parser from 'rss-parser';

const parser = new Parser();
const GEO = 'TW';
const PTT_STOCK_RSS = 'http://rss.ptt.cc/Stock.xml';

// Expanded keywords for better financial insights
const SEARCH_KEYWORDS = '(台股 OR 股市) (產能 OR 盤後 OR 盤前 OR 訂單 OR 大漲 OR 大跌)';
const ENCODED_KEYWORDS = encodeURIComponent(SEARCH_KEYWORDS);
const GOOGLE_NEWS_RSS = `https://news.google.com/rss/search?q=${ENCODED_KEYWORDS}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

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

export async function fetchThreadsOfficialApi(): Promise<TrendItem[]> {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!accessToken) {
    console.log('No THREADS_ACCESS_TOKEN found, skipping official API fetch.');
    return [];
  }

  try {
    // Official Threads API Search Endpoint (v1.0)
    const url = `https://graph.threads.net/v1.0/threads/search?q=${encodeURIComponent('台股')}&search_type=RECENT`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) throw new Error(`Threads API error: ${response.statusText}`);

    const data = await response.json();
    // Assuming structure based on Meta Graph API patterns
    return (data.data || []).map((item: any) => ({
      title: item.text?.slice(0, 100) || 'Threads Post',
      link: `https://www.threads.net/t/${item.id}`,
      pubDate: item.timestamp || new Date().toISOString(),
      description: item.text || '',
      source: 'Threads (Official)'
    }));
  } catch (error) {
    console.error('Error fetching from Threads Official API:', error);
    return [];
  }
}

export async function fetchThreadsTrends(): Promise<TrendItem[]> {
  // 1. Try Official API first
  const officialResult = await fetchThreadsOfficialApi();
  if (officialResult.length > 0) return officialResult;

  // 2. Fallback to Google News RSS search for Threads
  try {
    const THREADS_QUERY = `site:threads.net ${SEARCH_KEYWORDS}`;
    const THREADS_SEARCH_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(THREADS_QUERY)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const feed = await parser.parseURL(THREADS_SEARCH_URL);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.contentSnippet || item.content || '',
      source: 'Threads (via News)'
    }));
  } catch (error) {
    console.error('Error fetching Threads news:', error);
    return [];
  }
}

export async function fetchXTrends(): Promise<TrendItem[]> {
  // Placeholder for X (Twitter). Will use X API if X_BEARER_TOKEN is provided.
  // For now, using a specialized search via Google News for X financial updates
  try {
    const X_QUERY = `site:x.com ${SEARCH_KEYWORDS}`;
    const X_SEARCH_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(X_QUERY)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const feed = await parser.parseURL(X_SEARCH_URL);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      description: item.contentSnippet || item.content || '',
      source: 'X (via News)'
    }));
  } catch (error) {
    console.error('Error fetching X news:', error);
    return [];
  }
}

export async function fetchAllTrends(): Promise<TrendItem[]> {
  const [google, ptt, news, threads, x] = await Promise.all([
    fetchGoogleTrends(),
    fetchPTTTrends(),
    fetchGoogleNewsTrends(),
    fetchThreadsTrends(),
    fetchXTrends()
  ]);

  return [...google, ...ptt, ...news, ...threads, ...x];
}
