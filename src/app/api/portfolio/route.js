import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'portfolio.json');

// Ensure data file exists
if (!fs.existsSync(dataFilePath)) {
    try {
        const initialData = { symbols: ['AAPL', 'NVDA', 'TSLA', 'MSFT'] };
        fs.mkdirSync(path.dirname(dataFilePath), { recursive: true }); // Ensure dir exists
        fs.writeFileSync(dataFilePath, JSON.stringify(initialData, null, 4));
    } catch (e) {
        console.error("Failed to initialize portfolio file", e);
    }
}

export async function GET() {
    try {
        const fileContent = fs.readFileSync(dataFilePath, 'utf8');
        const data = JSON.parse(fileContent);
        return NextResponse.json({ symbols: data.symbols || [] });
    } catch (error) {
        console.error("Error reading portfolio file:", error);
        return NextResponse.json({ error: "Failed to load portfolio" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { symbols } = body;

        if (!Array.isArray(symbols)) {
            return NextResponse.json({ error: "Invalid format" }, { status: 400 });
        }

        const data = { symbols };
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 4));

        return NextResponse.json({ success: true, symbols });
    } catch (error) {
        console.error("Error saving portfolio file:", error);
        return NextResponse.json({ error: "Failed to save portfolio" }, { status: 500 });
    }
}
