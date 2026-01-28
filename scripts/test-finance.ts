import { getPriceTrend, formatPriceTrend } from '../src/lib/finance';

async function test() {
  const tickers = ['2330', 'TSLA', '^TWII', '6223']; // 2330 (TW), TSLA (US), ^TWII (Index), 6223 (TWO)
  console.log('Testing price trends...');
  
  for (const ticker of tickers) {
    const trend = await getPriceTrend(ticker);
    console.log(formatPriceTrend(trend));
  }
}

test().catch(console.error);
