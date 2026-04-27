import React from "react";

/**
 * CSSBarChart — Pure CSS/HTML horizontal bar chart, RTL-native.
 *
 * Props:
 *   data        – [{ label, value, color?, sub? }]
 *   maxValue    – optional override (auto-calculated from data)
 *   formatValue – (v) => string  (default: number)
 *   barHeight   – px per bar row (default 28)
 *   maxRows     – max visible rows before scroll (default 10)
 *   unit        – suffix after value e.g. "%", " درس"
 *   showPercent – if true, bar width = value/100 and shows "%"
 *   accent      – fallback color when item has no color
 */
export const CSSBarChart = ({
    data = [],
    maxValue: maxProp,
    formatValue,
    barHeight = 28,
    maxRows = 10,
    unit = "",
    showPercent = false,
    accent = "#7f1d1d",
}) => {
    if (!data.length)
        return <p className="py-6 text-center text-sm text-slate-400">لا توجد بيانات</p>;

    const max = showPercent ? 100 : (maxProp || Math.max(...data.map((d) => d.value), 1));
    const fmt = formatValue || ((v) => `${Number(v).toLocaleString("en-US")}${unit}`);

    const scrollHeight = barHeight * maxRows + 8;
    const needsScroll = data.length > maxRows;

    return (
        <div
            className={needsScroll ? "overflow-y-auto overflow-x-hidden" : ""}
            style={needsScroll ? { maxHeight: scrollHeight } : undefined}
            dir="rtl"
        >
            <div className="space-y-1.5">
                {data.map((item, i) => {
                    const pct = Math.min(100, Math.max(0, (item.value / max) * 100));
                    const color = item.color || accent;
                    return (
                        <div key={i} className="flex items-center gap-2" style={{ minHeight: barHeight }}>
                            {/* الاسم */}
                            <span
                                className="flex-shrink-0 text-xs font-semibold text-slate-700 truncate text-right"
                                style={{ width: 120 }}
                                title={item.label}
                            >
                                {item.label}
                            </span>

                            {/* الشريط */}
                            <div className="flex-1 min-w-0 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                                <div
                                    className="h-full rounded-full transition-all duration-500 ease-out"
                                    style={{
                                        width: `${pct}%`,
                                        background: `linear-gradient(90deg, ${color}dd, ${color})`,
                                        minWidth: pct > 0 ? 4 : 0,
                                    }}
                                />
                            </div>

                            {/* القيمة */}
                            <span
                                className="flex-shrink-0 text-xs font-bold tabular-nums text-left"
                                style={{ width: 60, color }}
                            >
                                {fmt(item.value)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
