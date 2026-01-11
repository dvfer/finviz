"use client";

import Link from 'next/link';

import { useState, useEffect } from 'react';
import PortfolioList from './PortfolioList';
import StockChart from './StockChart';
import StrategyCalculator from './StrategyCalculator';
import { Plus, Search } from 'lucide-react';
import clsx from 'clsx'; // Ensure clsx is imported

export default function Dashboard() {
    const [symbols, setSymbols] = useState(['AAPL', 'NVDA', 'TSLA', 'MSFT']);
    const [portfolioData, setPortfolioData] = useState([]);
    const [excludedSymbols, setExcludedSymbols] = useState(new Set());
    const [performanceData, setPerformanceData] = useState({});
    const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
    const [chartData, setChartData] = useState(null);
    const [newSymbol, setNewSymbol] = useState('');
    const [timeRange, setTimeRange] = useState('1mo');
    const [loading, setLoading] = useState(false);

    // Load persisted symbols on mount
    useEffect(() => {
        const loadSymbols = async () => {
            try {
                const res = await fetch('/api/portfolio');
                const data = await res.json();
                if (data.symbols && Array.isArray(data.symbols)) {
                    setSymbols(data.symbols);
                }
            } catch (e) {
                console.error("Failed to load portfolio symbols", e);
            }
        };
        loadSymbols();
    }, []);

    // Fetch Portfolio Data (Price/Change)
    useEffect(() => {
        if (symbols.length === 0) {
            setPortfolioData([]);
            return;
        }

        const fetchPortfolio = async () => {
            try {
                const promises = symbols.map(s =>
                    fetch(`/api/quote?symbol=${s}`).then(res => res.json())
                );
                const results = await Promise.all(promises);
                const validData = results.filter(r => !r.error && r.symbol);
                setPortfolioData(validData);
            } catch (err) {
                console.error("Failed to fetch portfolio", err);
            }
        };

        fetchPortfolio();
        const interval = setInterval(fetchPortfolio, 30000);
        return () => clearInterval(interval);
    }, [symbols]);

    // Fetch Performance Data (Range-based)
    useEffect(() => {
        if (symbols.length === 0) return;

        const fetchPerformance = async () => {
            try {
                const res = await fetch(`/api/performance?symbols=${symbols.join(',')}&range=${timeRange}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    const map = {};
                    data.forEach(item => {
                        map[item.symbol] = item.change;
                    });
                    setPerformanceData(map);
                }
            } catch (err) {
                console.error("Failed to fetch performance", err);
            }
        };

        fetchPerformance();
    }, [symbols, timeRange]);

    // Fetch Chart Data
    useEffect(() => {
        if (!selectedSymbol) return;

        const fetchChart = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/chart?symbol=${selectedSymbol}&range=${timeRange}`);
                const data = await res.json();
                if (!data.error) {
                    setChartData(data);
                }
            } catch (err) {
                console.error("Failed to fetch chart", err);
            } finally {
                setLoading(false);
            }
        };

        fetchChart();
    }, [selectedSymbol, timeRange]);

    const handleAddStock = async (e) => {
        e.preventDefault();
        if (newSymbol && !symbols.includes(newSymbol.toUpperCase())) {
            const updatedSymbols = [...symbols, newSymbol.toUpperCase()];
            setSymbols(updatedSymbols);
            setNewSymbol('');

            // Persist
            try {
                await fetch('/api/portfolio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols: updatedSymbols })
                });
            } catch (e) {
                console.error("Failed to save portfolio", e);
            }
        }
    };

    const handleToggleExclusion = (symbol) => {
        setExcludedSymbols(prev => {
            const next = new Set(prev);
            if (next.has(symbol)) {
                next.delete(symbol);
            } else {
                next.add(symbol);
            }
            return next;
        });
    };

    const handleRemoveStock = async (symbol) => {
        const updatedSymbols = symbols.filter(s => s !== symbol);
        setSymbols(updatedSymbols);
        if (selectedSymbol === symbol && updatedSymbols.length > 0) {
            setSelectedSymbol(updatedSymbols[0]);
        }

        // Persist
        try {
            await fetch('/api/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbols: updatedSymbols })
            });
        } catch (e) {
            console.error("Failed to save portfolio", e);
        }
    };

    const currentStock = portfolioData.find(s => s.symbol === selectedSymbol);

    return (
        <div className="container">
            <header className="header">
                <div>
                    <h1 className="brand-title">
                        <span style={{ color: '#fff' }}>Fin</span>Viz
                    </h1>
                    <p className="brand-subtitle">Real-time Market Insights</p>
                </div>
            </header>

            <div className="main-grid">

                {/* Left Column: Portfolio & Strategy */}
                <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', position: 'sticky', top: '20px', overflow: 'hidden' }}>

                    <form onSubmit={handleAddStock} className="glass-panel search-bar mb-4 flex-shrink-0">
                        <Search color="var(--text-secondary)" size={20} />
                        <input
                            type="text"
                            placeholder="Search symbol..."
                            className="search-input"
                            value={newSymbol}
                            onChange={(e) => setNewSymbol(e.target.value)}
                        />
                        <button type="submit" className="icon-btn">
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="mb-4 flex flex-col flex-1 min-h-0">
                        <h2 className="section-title mb-2 flex-shrink-0">Your Portfolio</h2>
                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                            <PortfolioList
                                stocks={portfolioData}
                                onSelect={setSelectedSymbol}
                                onRemove={handleRemoveStock}
                                selectedSymbol={selectedSymbol}
                                excludedSymbols={excludedSymbols}
                                onToggleExclusion={handleToggleExclusion}
                                performanceData={performanceData}
                                timeRange={timeRange}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Chart & Details */}
                <div className="content">
                    {currentStock && (
                        <div className="glass-panel detail-panel">
                            <div className="stock-header">
                                <div>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>{currentStock.shortName || currentStock.symbol}</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                        <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{currentStock.symbol}</span>
                                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{currentStock.currency}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="big-price">${currentStock.regularMarketPrice?.toFixed(2)}</div>
                                    <div className={clsx("big-change", currentStock.regularMarketChangePercent >= 0 ? "text-success" : "text-danger")}>
                                        {currentStock.regularMarketChangePercent?.toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end mb-4">
                                <div className="segmented-control">
                                    {['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '3y', '5y'].map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            className={clsx("segment-btn", timeRange === range && "active")}
                                        >
                                            {range.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="chart-container">
                                {loading ? (
                                    <div className="flex-center loading">Loading Market Data...</div>
                                ) : (
                                    <StockChart data={chartData} symbol={selectedSymbol} />
                                )}
                            </div>

                            <div className="metric-grid">
                                <div className="metric-item">
                                    <div className="metric-label">Open</div>
                                    <div className="metric-value">${currentStock.regularMarketOpen?.toFixed(2)}</div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">High</div>
                                    <div className="metric-value">${currentStock.regularMarketDayHigh?.toFixed(2)}</div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Low</div>
                                    <div className="metric-value">${currentStock.regularMarketDayLow?.toFixed(2)}</div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Vol</div>
                                    <div className="metric-value">{(currentStock.regularMarketVolume / 1000000).toFixed(1)}M</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!currentStock && !loading && (
                        <div className="glass-panel detail-panel flex-center">
                            Select stock to view details
                        </div>
                    )}

                    <div className="mt-6">
                        <StrategyCalculator
                            stocks={portfolioData.filter(s => !excludedSymbols.has(s.symbol))}
                            selectedRange={timeRange}
                            selectedStock={selectedSymbol}
                            onSelectStock={setSelectedSymbol}
                            isWideMode={true}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
