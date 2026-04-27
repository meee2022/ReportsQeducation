import React from "react";

export const StatCard = ({ label, value, sub, icon, accent = "#7f1d1d" }) => (
    <div className="rounded-xl border bg-white shadow-sm p-4 flex items-center gap-3"
        style={{ borderRight: `4px solid ${accent}` }}>
        <div className="rounded-lg p-2.5 flex-shrink-0" style={{ background: `${accent}18` }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { className: "h-5 w-5", style: { color: accent } }) : null}
        </div>
        <div className="min-w-0 whitespace-nowrap overflow-hidden">
            <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
            <p className="text-xl font-extrabold text-slate-800">{value}</p>
            {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
        </div>
    </div>
);
