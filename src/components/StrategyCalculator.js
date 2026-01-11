"use client";

import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Calculator } from 'lucide-react';
import { ResponsiveContainer, Tooltip as RechartsTooltip, ComposedChart, Area, XAxis, YAxis, ReferenceLine, ReferenceDot, PieChart, Pie, Cell } from 'recharts';
import clsx from 'clsx';
import strategyPresets from '../data/strategy_presets.json';

export default function StrategyCalculator({ stocks, selectedRange = '1y', selectedStock, onSelectStock, isWideMode = false }) {
    const [budget, setBudget] = useState(70);
    // lookback removed, using selectedRange prop
    const [chartView, setChartView] = useState('distance'); // Default to distance view as requested

    const [alpha, setAlpha] = useState(strategyPresets.defaults.alpha); // Reversion Weight
    const [beta, setBeta] = useState(strategyPresets.defaults.beta); // Momentum Weight



    // Historical data for ALL stocks (symbol -> [{date, price}])
    const [allHistories, setAllHistories] = useState({});
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Initialize selected stock
    useEffect(() => {
        if (stocks.length > 0 && selectedStock === undefined) {
            // Let parent handle or no-op
        }
    }, [stocks, selectedStock]);

    // Fetch History for ALL stocks when stocks or selectedRange changes
    useEffect(() => {
        const fetchAllHistories = async () => {
            // ... existing fetch logic ...
            setLoadingHistory(true);
            try {
                const promises = stocks.map(async (stock) => {
                    const res = await fetch(`/api/chart?symbol=${stock.symbol}&range=${selectedRange}`);
                    const data = await res.json();
                    if (!data.error && data.quotes) {
                        return {
                            symbol: stock.symbol,
                            data: data.quotes.map(q => ({
                                date: new Date(q.date).toLocaleDateString(),
                                price: q.close
                            })).filter(p => p.price)
                        };
                    }
                    return { symbol: stock.symbol, data: [] };
                });

                const results = await Promise.all(promises);
                const historyMap = {};
                results.forEach(r => {
                    historyMap[r.symbol] = r.data;
                });
                setAllHistories(historyMap);

            } catch (e) {
                console.error("Failed to fetch histories", e);
            } finally {
                setLoadingHistory(false);
            }
        };
        // ...
        if (stocks.length > 0) fetchAllHistories();
    }, [stocks, selectedRange]);


    const allocations = useMemo(() => {
        if (!stocks || stocks.length === 0) return [];

        const stockScores = stocks.map(stock => {
            const price = stock.regularMarketPrice || 0;
            const history = allHistories[stock.symbol] || [];

            // 1. Calculate Peak (for Dip) & Average (for Trend)
            let localHigh = 0;
            let peakDate = null;
            let averagePrice = price; // Default

            if (history.length > 0) {
                const maxItem = history.reduce((max, obj) => (obj.price > max.price ? obj : max), history[0]);
                localHigh = maxItem.price;
                peakDate = maxItem.date;

                const sum = history.reduce((acc, item) => acc + item.price, 0);
                averagePrice = sum / history.length;
            } else {
                localHigh = selectedRange === '1y' ? (stock.fiftyTwoWeekHigh || price) : price;
            }

            const high = localHigh || price;

            // Dip Ratio (0 to 1) - Higher is better for Reversion
            let dipRatio = 0;
            if (high > 0) {
                dipRatio = Math.max(0, (high - price) / high);
            }

            // Trend Score (approx -0.2 to 0.2) - Higher is better for Momentum
            // (Price - Average) / Average
            const trendScore = averagePrice > 0 ? (price - averagePrice) / averagePrice : 0;

            // Weighted Score Formula
            // Score = (Dip * Alpha) + (Trend * Beta) + 0.1 (Base)
            // Ensure non-negative
            const rawScore = (dipRatio * alpha) + (trendScore * beta) + 0.1;
            const score = Math.max(0.01, rawScore);

            return {
                ...stock,
                targetHigh: high,
                peakDate,
                score,
                dipPercent: dipRatio * 100,
                trendScore: trendScore * 100 // For display if needed
            };
        });

        const totalScore = stockScores.reduce((sum, s) => sum + s.score, 0);

        return stockScores.map(s => {
            const weight = totalScore > 0 ? s.score / totalScore : 0;
            return {
                symbol: s.symbol,
                allocation: budget * weight,
                percent: weight * 100,
                dip: s.dipPercent,
                trend: s.trendScore,
                price: s.regularMarketPrice,
                targetHigh: s.targetHigh,
                peakDate: s.peakDate
            };
        }).sort((a, b) => b.allocation - a.allocation);
    }, [stocks, budget, allHistories, selectedRange, alpha, beta]); // Added alpha, beta dependencies


    const getPeakData = () => {
        if (!selectedStock) return { peak: 0, date: null };
        const alloc = allocations.find(a => a.symbol === selectedStock);
        return alloc ? { peak: alloc.targetHigh, date: alloc.peakDate } : { peak: 0, date: null };
    };

    const currentHistory = allHistories[selectedStock] || [];

    const chartData = useMemo(() => {
        const { peak } = getPeakData();
        if (!peak) return [];
        return currentHistory.map(item => ({
            ...item,
            distance: ((item.price - peak) / peak) * 100
        }));
    }, [currentHistory, allocations, selectedStock]);

    const renderChart = () => {
        if (!chartData || chartData.length === 0) return null;

        const peakData = getPeakData();
        const lastItem = chartData[chartData.length - 1];
        const currentPrice = lastItem?.price || 0;
        const dipPercent = lastItem ? ((currentPrice - peakData.peak) / peakData.peak) * 100 : 0;



        return (
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="gradientPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <RechartsTooltip
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                    labelStyle={{ display: 'none' }}
                    itemStyle={{ fontSize: '12px' }}
                />
                <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#8884d8"
                    strokeWidth={2}
                    fill="url(#gradientPrice)"
                />

                {/* Peak Tangent Point & Horizontal Line */}
                {peakData.date && (
                    <>
                        <ReferenceDot
                            x={peakData.date}
                            y={peakData.peak}
                            r={5}
                            fill="#ff0055"
                            stroke="#fff"
                            strokeWidth={2}
                            isFront={true}
                        />
                        <ReferenceLine
                            segment={[
                                { x: peakData.date, y: peakData.peak },
                                { x: lastItem ? lastItem.date : '', y: peakData.peak }
                            ]}
                            stroke="#ff0055"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            label={{ value: 'Peak', position: 'insideTopLeft', fill: '#ff0055', fontSize: 10 }}
                        />
                    </>
                )}

                {/* Vertical Gap Line (The Drawdown) */}
                {lastItem && (
                    <ReferenceLine
                        segment={[
                            { x: lastItem.date, y: peakData.peak },
                            { x: lastItem.date, y: currentPrice }
                        ]}
                        stroke="#ff0055"
                        strokeDasharray="3 3"
                        strokeWidth={2}
                        label={{
                            value: `${dipPercent.toFixed(1)}%`,
                            position: 'right',
                            fill: '#ff0055',
                            fontSize: 12,
                            fontWeight: 'bold'
                        }}
                    />
                )}
            </ComposedChart>
        );
    };

    return (
        <div className="glass-panel p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Calculator className="text-accent-blue" size={24} />
                    <h2 className="text-xl font-bold">Smart Allocator</h2>
                </div>
            </div>

            <div className={clsx("flex-1", isWideMode ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "flex flex-col")}>

                <div className="flex flex-col space-y-6">
                    <div>
                        <label className="block text-secondary text-xs uppercase tracking-wider mb-3">Total Investable Budget</label>
                        <div className="glass-panel flex items-center px-4 py-4 bg-white/5 border border-white/10 focus-within:border-accent-blue/50 transition-colors">
                            <DollarSign className="text-success mr-2" size={24} />
                            <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                                className="bg-transparent border-none outline-none text-3xl font-mono font-bold w-full text-white placeholder-white/20"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent-blue transition-colors appearance-none cursor-pointer"
                            value={strategyPresets.presets.find(p => p.alpha === alpha && p.beta === beta)?.name || ""}
                            onChange={(e) => {
                                const preset = strategyPresets.presets.find(p => p.name === e.target.value);
                                if (preset) {
                                    setAlpha(preset.alpha);
                                    setBeta(preset.beta);
                                }
                            }}
                        >
                            {strategyPresets.presets.map(preset => (
                                <option key={preset.name} value={preset.name} className="bg-black text-white">
                                    {preset.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ height: isWideMode ? '300px' : '220px', width: '100%', flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={allocations}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={isWideMode ? 100 : 70}
                                    dataKey="allocation"
                                    nameKey="symbol"
                                    label={({ symbol, allocation }) => `${symbol}: $${allocation.toFixed(0)}`}
                                    onClick={(data) => onSelectStock(data.symbol)}
                                    className="cursor-pointer outline-none"
                                >
                                    {allocations.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={['#00ff9d', '#00ccff', '#ff0055', '#ffaa00', '#aa00ff', '#ffffff'][index % 6]}
                                            stroke="rgba(0,0,0,0.5)"
                                        />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value, name, props) => [`${props.payload.percent.toFixed(1)}%`, name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-secondary sticky top-0 bg-[#0a0a0a] z-10">
                            <tr>
                                <th className="pb-3 font-medium">Symbol</th>
                                <th className="pb-3 font-medium text-right">Dip</th>
                                <th className="pb-3 font-medium text-right">Trend</th>
                                <th className="pb-3 font-medium text-right">Alloc</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.map((item) => (
                                <tr key={item.symbol} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onSelectStock(item.symbol)}>
                                    <td className="py-3 font-bold text-white text-base">{item.symbol}</td>
                                    <td className="py-3 text-right">
                                        <span className={clsx(item.dip > 10 ? "text-success" : "text-secondary")}>
                                            -{item.dip.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="py-3 text-right text-secondary">
                                        {item.trend.toFixed(1)}%
                                    </td>
                                    <td className="py-3 text-right font-mono text-accent-blue font-bold text-lg">
                                        ${item.allocation.toFixed(0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );

}
