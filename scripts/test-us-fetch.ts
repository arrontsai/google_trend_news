import { fetchUSStockNews } from '../src/lib/us-stocks';

async function main() {
  console.log('Testing US Stocks News Fetching...');
  try {
    const news = await fetchUSStockNews();
    console.log(`Fetched ${news.length} news items.`);
    if (news.length > 0) {
      console.log('\nTop 3 Headlines:');
      news.slice(0, 3).forEach((n, i) => {
        console.log(`${i + 1}. [${n.source}] ${n.headline}`);
      });
    } else {
      console.log('No news items fetched. Please check your FINNHUB_API_KEY.');
    }
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

main();
