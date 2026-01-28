import { fetchAllTrends } from '../src/lib/trends';

async function main() {
  const trends = await fetchAllTrends();
  const stockRegex = /\b\d{4}\b/g;
  const stocks = new Set<string>();

  console.log('--- Analyzing Stock Tickers ---');
  trends.forEach(t => {
    const matches = t.title.match(stockRegex);
    if (matches) {
      matches.forEach(s => stocks.add(s));
    }
    // Also check description for PTT/News
    const descMatches = (t.description || '').match(stockRegex);
    if (descMatches) {
      descMatches.forEach(s => stocks.add(s));
    }
  });

  console.log('Identified Potential Stock Tickers:', Array.from(stocks).join(', '));
  
  console.log('\n--- Details for Top 20 ---');
  trends.slice(0, 20).forEach((t, i) => {
    console.log(`${i+1}. [${t.source}] ${t.title}`);
  });
}

main().catch(console.error);
