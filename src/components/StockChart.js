"use client";

import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { useMemo } from 'react';

export default function StockChart({ data, symbol }) {
    const chartData = useMemo(() => {
        if (!data || !data.quotes) return [];
        return data.quotes.map(q => ({
            date: new Date(q.date).toLocaleDateString(),
            value: q.close ? parseFloat(q.close.toFixed(2)) : null
        })).filter(d => d.value !== null);
    }, [data]);

    // Calculate Gap / Peak Data
    const { peakValue, peakDate, lastValue, lastDate, dipPercent } = useMemo(() => {
        if (chartData.length === 0) return { peakValue: 0, peakDate: null, lastValue: 0, lastDate: null, dipPercent: 0 };

        const maxItem = chartData.reduce((max, obj) => (obj.value > max.value ? obj : max), chartData[0]);
        const last = chartData[chartData.length - 1];
        const peak = maxItem.value;
        const current = last.value;
        const dip = peak > 0 ? ((current - peak) / peak) * 100 : 0;

        return {
            peakValue: peak,
            peakDate: maxItem.date,
            lastValue: current,
            lastDate: last.date,
            dipPercent: dip
        };
    }, [chartData]);

    const isPositive = chartData.length > 0 && chartData[chartData.length - 1].value >= chartData[0].value;
    const color = isPositive ? '#00ff9d' : '#ff0055'; // Success Green or Danger Red

    if (!data) return <div className="flex-center text-secondary">Loading Chart Data...</div>;

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <defs>
                        <linearGradient id="gradientColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#666', fontSize: 12 }}
                        minTickGap={50}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        hide
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value) => [`$${value}`, 'Price']}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill="url(#gradientColor)"
                    />

                    {/* Peak Tangent Dot */}
                    {peakDate && dipPercent < -0.01 && (
                        <ReferenceDot
                            x={peakDate}
                            y={peakValue}
                            r={5}
                            fill="#ff0055"
                            stroke="#fff"
                            strokeWidth={2}
                            isFront={true}
                        />
                    )}

                    {/* Horizontal Tangent Line */}
                    {peakDate && lastDate && dipPercent < -0.01 && (
                        <ReferenceLine
                            segment={[
                                { x: peakDate, y: peakValue },
                                { x: lastDate, y: peakValue }
                            ]}
                            stroke="#ff0055"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            label={{ value: 'Peak', position: 'insideTopLeft', fill: '#ff0055', fontSize: 12 }}
                        />
                    )}

                    {/* Vertical Drawdown Line */}
                    {lastDate && dipPercent < -0.01 && (
                        <ReferenceLine
                            segment={[
                                { x: lastDate, y: peakValue },
                                { x: lastDate, y: lastValue }
                            ]}
                            stroke="#ff0055"
                            strokeDasharray="3 3"
                            strokeWidth={2}
                            label={{
                                value: `${dipPercent.toFixed(1)}%`,
                                position: 'left',
                                fill: '#ff0055',
                                fontSize: 14,
                                fontWeight: 'bold'
                            }}
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
