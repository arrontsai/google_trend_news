import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export interface PriceTrend {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  currency: string;
}

/**
 * Normalizes a ticker symbol for Yahoo Finance.
 * Examples: 
 * - '2330' -> '2330.TW'
 * - '2317' -> '2317.TW' (might need .TWO for some stocks, but .TW is a good first guess)
 * - 'TSLA' -> 'TSLA'
 */
function normalizeSymbol(ticker: string): string {
  // If it's a 4-6 digit number, it's likely a Taiwan stock
  if (/^\d{4,6}$/.test(ticker)) {
    return `${ticker}.TW`;
  }
  return ticker;
}

export async function getPriceTrend(ticker: string): Promise<PriceTrend> {
  const symbol = normalizeSymbol(ticker);
  try {
    const result: any = await yahooFinance.quote(symbol);
    if (!result) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    
    return {
      symbol: result.symbol,
      name: result.shortName || result.longName || ticker,
      price: result.regularMarketPrice || null,
      changePercent: result.regularMarketChangePercent || null,
      currency: result.currency || '',
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    
    // If .TW failed, try .TWO for Taiwan OTC stocks
    if (symbol.endsWith('.TW')) {
      const otcSymbol = symbol.replace('.TW', '.TWO');
      try {
        const otcResult: any = await yahooFinance.quote(otcSymbol);
        if (!otcResult) {
          throw new Error(`Symbol ${otcSymbol} not found`);
        }
        return {
          symbol: otcResult.symbol,
          name: otcResult.shortName || otcResult.longName || ticker,
          price: otcResult.regularMarketPrice || null,
          changePercent: otcResult.regularMarketChangePercent || null,
          currency: otcResult.currency || '',
        };
      } catch (otcError) {
        // Silently fail for OTC attempt, will return "No data" below
      }
    }

    return {
      symbol,
      name: ticker,
      price: null,
      changePercent: null,
      currency: '',
    };
  }
}

export function formatPriceTrend(trend: PriceTrend): string {
  if (trend.price === null || trend.changePercent === null) {
    return `- ${trend.name} (${trend.symbol}): 暫無數據`;
  }

  const sign = trend.changePercent >= 0 ? '+' : '';
  const emoji = trend.changePercent >= 0 ? '🔺' : '🔻';
  
  return `- ${trend.name} (${trend.symbol}): ${trend.price.toFixed(2)} (${sign}${trend.changePercent.toFixed(2)}%) ${emoji}`;
}
