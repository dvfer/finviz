import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const range = searchParams.get('range') || '1mo'; // 1d, 5d, 1mo, 3mo, 6mo, 1y, ytd, max

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Map simplified ranges to yahoo finance options if needed, but yahoo-finance2 chart takes period1/interval usually
    // However, queryOptions { range: '1mo', interval: '1d' } works for chart?
    // Let's check yahoo-finance2 docs or assume standard 'chart' method supports query options.
    // Actually, yahooFinance.chart(symbol, queryOptions) matches the API.

    let interval = '1d';
    let period1 = new Date();

    switch (range) {
        case '1d':
            period1.setDate(period1.getDate() - 1);
            interval = '15m';
            break;
        case '5d':
            period1.setDate(period1.getDate() - 5);
            interval = '15m';
            break;
        case '1mo':
            period1.setMonth(period1.getMonth() - 1);
            break;
        case '3mo':
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
        default: // Fallback to 1 month
            period1.setMonth(period1.getMonth() - 1);
    }

    try {
        const chartData = await yahooFinance.chart(symbol, { period1: period1.toISOString(), interval });
        return NextResponse.json(chartData);
    } catch (error) {
        console.error('Error fetching chart:', error);
        return NextResponse.json({ error: 'Failed to fetch chart', details: error.message }, { status: 500 });
    }
}
