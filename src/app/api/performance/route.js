
import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

const yahooFinance = new YahooFinance();

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const range = searchParams.get('range') || '1mo'; // 1d, 5d, 1mo, 3mo, 6mo, 1y

    if (!symbolsParam) {
        return NextResponse.json({ error: 'Symbols required' }, { status: 400 });
    }

    const symbols = symbolsParam.split(',');
    const results = {};

    // Determine period1 (Start Date) based on range
    let period1 = new Date();
    // Default to '1d' interval for efficiency, except 1d/5d might need '15m' or '60m' if user wants intraday precision?
    // User asked for "monthly by default", implying broad strokes.
    // '1d' interval is sufficient for % change. '15m' for 1d/5d.
    let interval = '1d';

    switch (range) {
        case '1d':
            period1.setDate(period1.getDate() - 1);
            interval = '15m'; // Intraday
            break;
        case '5d':
            period1.setDate(period1.getDate() - 5);
            interval = '60m';
            break;
        case '1mo': // 1m -30d
            // Yahoo usually handles '1mo' range via query options too, but let's be explicit
            period1.setMonth(period1.getMonth() - 1);
            break;
        case '3mo': // Yahoo finance param
            period1.setMonth(period1.getMonth() - 3);
            break;
        case '6mo':
            period1.setMonth(period1.getMonth() - 6);
            break;
        case '1y':
            period1.setFullYear(period1.getFullYear() - 1);
            break;
        case '2y':
            period1.setFullYear(period1.getFullYear() - 2);
            break;
        case '3y':
            period1.setFullYear(period1.getFullYear() - 3);
            break;
        case '5y':
            period1.setFullYear(period1.getFullYear() - 5);
            break;
        default:
            period1.setMonth(period1.getMonth() - 1);
    }

    // Process all symbols
    // Note: yahoo-finance2 chart() does not support batch symbols. spark() might.
    // But safely we can Promise.all individual chart calls. Limiting concurrency if needed.
    // Given portfolio size is small (~10-20), Promise.all is fine.

    const promises = symbols.map(async (sym) => {
        try {
            // We only need the first and last point to calc % change?
            // Or use quoteSummary for some ranges?
            // Chart is most reliable for "custom range performance".
            const queryOptions = { period1: period1.toISOString(), interval };
            const result = await yahooFinance.chart(sym, queryOptions);

            if (!result || !result.quotes || result.quotes.length === 0) {
                return { symbol: sym, change: 0, error: 'No data' };
            }

            const quotes = result.quotes;
            const startPrice = quotes[0].close || quotes[0].open;
            const endPrice = quotes[quotes.length - 1].close;

            if (!startPrice || !endPrice) return { symbol: sym, change: 0 };

            const changePercent = ((endPrice - startPrice) / startPrice) * 100;
            return { symbol: sym, change: changePercent };

        } catch (e) {
            console.error(`Error fetching performance for ${sym}`, e);
            return { symbol: sym, change: 0, error: e.message };
        }
    });

    const data = await Promise.all(promises);
    return NextResponse.json(data);
}
