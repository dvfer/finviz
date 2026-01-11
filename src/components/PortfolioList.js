"use client";

import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export default function PortfolioList({ stocks, onSelect, onRemove, selectedSymbol, excludedSymbols, onToggleExclusion, performanceData, timeRange }) {
    if (!stocks || stocks.length === 0) {
        return <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No stocks added.</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stocks.map((stock) => {
                const dailyChange = stock.regularMarketChangePercent;
                const rangeChange = performanceData?.[stock.symbol];
                const displayChange = rangeChange !== undefined ? rangeChange : dailyChange;
                const isPositive = displayChange >= 0;

                return (
                    <div
                        key={stock.symbol}
                        onClick={() => onSelect(stock.symbol)}
                        className={clsx(
                            "glass-panel portfolio-item",
                            selectedSymbol === stock.symbol && "active"
                        )}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="checkbox"
                                checked={!excludedSymbols?.has(stock.symbol)}
                                onChange={() => onToggleExclusion && onToggleExclusion(stock.symbol)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                            />
                            <div className="stock-info">
                                <h3>{stock.symbol}</h3>
                                <span>{stock.shortName?.substring(0, 15)}...</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="price-info">
                                <span className="price-value">${stock.regularMarketPrice?.toFixed(2)}</span>
                                <span className={clsx("change-badge", isPositive ? "text-success" : "text-danger")}>
                                    {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                    {Math.abs(displayChange).toFixed(2)}%
                                    {timeRange && <span style={{ fontSize: '9px', opacity: 0.7, marginLeft: '4px' }}>{timeRange.toUpperCase()}</span>}
                                </span>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(stock.symbol); }}
                                className="icon-btn"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
