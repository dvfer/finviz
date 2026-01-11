import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const quote = await yahooFinance.quote(symbol);
        return NextResponse.json(quote);
    } catch (error) {
        console.error('Error fetching quote:', error);
        return NextResponse.json({ error: 'Failed to fetch quote', details: error.message }, { status: 500 });
    }
}
