import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { CSSBarChart } from "@/components/charts/CSSBarChart";

const BRAND = "hsl(345,65%,35%)";
const GREEN = "#16a34a";
const AMBER = "#ca8a04";
const RED = "#dc2626";

export const pctColor = (v) => (v >= 80 ? GREEN : v >= 60 ? AMBER : RED);

export const RadarPerformanceChart = ({ data }) => {
    return (
        <Card className="shadow-none">
            <CardHeader className="border-b bg-muted/30 px-4 py-3">
                <CardTitle className="text-sm font-bold">رادار الأداء الشامل</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <div className="h-64 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis
                                dataKey="metric"
                                tick={{ fontSize: 9, fill: "hsl(var(--foreground))" }}
                            />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                            <Radar
                                name="الأداء"
                                dataKey="value"
                                stroke={BRAND}
                                fill={BRAND}
                                fillOpacity={0.4}
                            />
                            <Tooltip
                                formatter={(v) => [`${Math.round(v)}%`, "النسبة"]}
                                contentStyle={{ direction: "rtl", fontSize: 11, borderRadius: 6 }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export const SubjectCompletionChart = ({ data }) => {
    return (
        <Card className="shadow-none">
            <CardHeader className="border-b bg-muted/30 px-4 py-3">
                <CardTitle className="text-sm font-bold">اكتمال الدروس حسب المادة</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                {data.length > 0 ? (
                    <CSSBarChart
                        data={data.map((d) => ({
                            label: d.name,
                            value: d.pct,
                            color: pctColor(d.pct),
                        }))}
                        showPercent
                        unit="%"
                        maxRows={8}
                    />
                ) : (
                    <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات</p>
                )}
            </CardContent>
        </Card>
    );
};
