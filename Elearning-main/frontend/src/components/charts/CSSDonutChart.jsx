import React from "react";

/**
 * CSSDonutChart — Pure CSS donut using conic-gradient, RTL-friendly.
 *
 * Props:
 *   data   – [{ label, value, color }]
 *   size   – diameter in px (default 180)
 *   thick  – ring thickness in px (default 32)
 *   center – optional React node to render in center hole
 */
export const CSSDonutChart = ({
    data = [],
    size = 180,
    thick = 32,
    center,
}) => {
    const total = data.reduce((s, d) => s + (d.value || 0), 0);
    if (total === 0)
        return <p className="py-6 text-center text-sm text-slate-400">لا توجد بيانات</p>;

    // Build conic-gradient stops
    let cumulative = 0;
    const stops = data.flatMap((d) => {
        const start = cumulative;
        const pct = (d.value / total) * 100;
        cumulative += pct;
        return [`${d.color} ${start}%`, `${d.color} ${cumulative}%`];
    });

    const gradient = `conic-gradient(${stops.join(", ")})`;

    return (
        <div className="flex flex-col items-center gap-4" dir="rtl">
            {/* الدائرة */}
            <div
                className="relative rounded-full flex-shrink-0"
                style={{
                    width: size,
                    height: size,
                    background: gradient,
                }}
            >
                {/* الثقب الداخلي */}
                <div
                    className="absolute bg-white rounded-full flex items-center justify-center"
                    style={{
                        top: thick,
                        left: thick,
                        width: size - thick * 2,
                        height: size - thick * 2,
                    }}
                >
                    {center || (
                        <span className="text-lg font-extrabold text-slate-700">
                            {total.toLocaleString("en-US")}
                        </span>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                        <span
                            className="inline-block rounded-full flex-shrink-0"
                            style={{ width: 10, height: 10, background: d.color }}
                        />
                        <span className="text-slate-600 font-medium">{d.label}</span>
                        <span className="font-bold text-slate-800">
                            {d.value.toLocaleString("en-US")}
                        </span>
                        <span className="text-slate-400">
                            ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
