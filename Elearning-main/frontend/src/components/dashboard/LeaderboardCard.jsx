import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { getBadge, parseLevelNum } from "@/utils/levelUtils";

const toAr = (n) => Number(n || 0).toLocaleString("en-US");

export const LeaderboardCard = ({ title, icon, items, isTeacher, linkTo }) => {
    return (
        <Card className="shadow-none">
            <CardHeader className="border-b bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                        {icon} {title}
                    </CardTitle>
                    {linkTo && (
                        <Link to={linkTo} className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                            عرض الكل <ChevronRight className="h-3 w-3" />
                        </Link>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
                {items.length > 0 ? (
                    items.map((item, i) => {
                        const name = isTeacher ? item.teacherName : item.studentName;
                        const subtitle = isTeacher ? item.gameName : (item.className || item.grade);
                        const nLevel = parseLevelNum(item.level);
                        const badge = getBadge(item.level);

                        const cardBgClass = i === 0 ? "bg-yellow-50 border border-yellow-200" :
                            i === 1 ? "bg-slate-50 border border-slate-200" :
                                i === 2 ? "bg-orange-50 border border-orange-200" : "bg-muted/10 border border-muted/20";

                        const badgeBgClass = i === 0 ? "bg-yellow-400 text-yellow-900" :
                            i === 1 ? "bg-slate-400 text-white" :
                                i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground";

                        return (
                            <div key={i} className={`flex items-center gap-3 rounded-lg p-2.5 ${cardBgClass}`}>
                                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black shrink-0 ${badgeBgClass}`}>
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{subtitle || ""}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {badge ? (
                                        <Badge variant="outline" className="font-bold text-[10px] px-1.5 whitespace-nowrap" style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}>
                                            {badge.emoji} {badge.label}
                                        </Badge>
                                    ) : nLevel > 0 ? (
                                        <Badge variant="outline" className="font-bold text-[10px] px-1.5 whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">
                                            المستوى {nLevel}
                                        </Badge>
                                    ) : null}
                                    <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                                        {toAr(item.points)} نقطة
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-sm text-muted-foreground p-2">لا توجد بيانات صدارة</p>
                )}
            </CardContent>
        </Card>
    );
};
