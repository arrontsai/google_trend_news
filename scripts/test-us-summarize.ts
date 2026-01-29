import { summarizeUSStocksWithGemini } from '../src/lib/gemini';
import { StockNewsItem } from '../src/lib/us-stocks';

const mockNews: StockNewsItem[] = [
  {
    category: 'general',
    datetime: Date.now(),
    headline: 'NVIDIA hits new all-time high as AI demand continues to soar',
    id: 1,
    image: '',
    related: 'NVDA',
    source: 'Reuters',
    summary: 'NVIDIA shares rose 5% today as analysts expect strong earnings driven by data center Blackwell chip demand.',
    url: 'https://example.com'
  },
  {
    category: 'general',
    datetime: Date.now(),
    headline: 'Federal Reserve hints at interest rate cuts in upcoming meeting',
    id: 2,
    image: '',
    related: 'SPY',
    source: 'Bloomberg',
    summary: 'The Fed Chairman suggested that inflation is nearing the target, making rate cuts more likely in March.',
    url: 'https://example.com'
  }
];

async function main() {
  console.log('Testing US Stocks Summarization with Gemini...');
  try {
    const summary = await summarizeUSStocksWithGemini(mockNews);
    console.log('\n--- Generated Summary ---\n');
    console.log(summary);
    console.log('\n--- End of Summary ---\n');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
