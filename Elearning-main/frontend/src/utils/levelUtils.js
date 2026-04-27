export const ARABIC_LEVELS = {
    "صفر": 0, "الأول": 1, "الثاني": 2, "الثالث": 3, "الرابع": 4, "الخامس": 5,
    "السادس": 6, "السابع": 7, "الثامن": 8, "التاسع": 9, "العاشر": 10,
    "الحادي عشر": 11, "الثاني عشر": 12, "الثالث عشر": 13, "الرابع عشر": 14,
    "الخامس عشر": 15, "السادس عشر": 16, "السابع عشر": 17, "الثامن عشر": 18,
    "التاسع عشر": 19, "العشرون": 20, "الحادي والعشرون": 21, "الثاني والعشرون": 22,
    "الثالث والعشرون": 23, "الرابع والعشرون": 24, "الخامس والعشرون": 25,
    "السادس والعشرون": 26, "السابع والعشرون": 27, "الثامن والعشرون": 28,
    "التاسع والعشرون": 29, "الثلاثون": 30,
};

export const parseLevelNum = (str) => {
    if (!str) return 0;
    const n = Number(str);
    if (!isNaN(n)) return n;
    const s = str.toString().trim().replace(/^المستوى\s*/, "").replace(/^مستوى\s*/, "");
    return ARABIC_LEVELS[s] ?? 0;
};

export const getBadge = (lvl) => {
    const n = parseLevelNum(lvl);
    if (n >= 30) return { emoji: "💎", label: "ماسية", bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc", name: "المستوى" };
    if (n >= 24) return { emoji: "🪩", label: "لؤلؤية", bg: "#f5f3ff", color: "#6d28d9", border: "#c4b5fd", name: "المستوى" };
    if (n >= 18) return { emoji: "🥇", label: "ذهبية", bg: "#fef9c3", color: "#92400e", border: "#fde047", name: "المستوى" };
    if (n >= 12) return { emoji: "🥈", label: "فضية", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", name: "المستوى" };
    if (n >= 6) return { emoji: "🥉", label: "برونزية", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", name: "المستوى" };
    return null;
};
