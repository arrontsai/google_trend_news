import YahooFinance from 'yahoo-finance2';
import { getPriceTrend, formatPriceTrend } from '../src/lib/finance';

const yahooFinance = new YahooFinance();

async function test() {
  const tickers = ['2330', 'TSLA']; 
  console.log('Testing raw data...');
  
  for (const ticker of tickers) {
    const symbol = ticker.includes('.') || ticker.startsWith('^') ? ticker : `${ticker}.TW`;
    const result = await yahooFinance.quote(symbol, { lang: 'zh-Hant-TW', region: 'TW' });
    console.log(`--- ${ticker} ---`);
    console.log(`shortName: ${result.shortName}`);
    console.log(`longName: ${result.longName}`);
    console.log(JSON.stringify(result, null, 2));
  }
}

test().catch(console.error);
