import { useState, useEffect } from "react";

/**
 * Hook يحفظ فلتر التاريخ في localStorage
 * @param {string} storageKey - مفتاح فريد لكل صفحة
 */
export function usePersistentDateFilter(storageKey) {
  const [fromDate, setFromDateState] = useState(
    () => localStorage.getItem(`${storageKey}_from`) || ""
  );
  const [toDate, setToDateState] = useState(
    () => localStorage.getItem(`${storageKey}_to`) || ""
  );

  const setFromDate = (val) => {
    setFromDateState(val);
    if (val) localStorage.setItem(`${storageKey}_from`, val);
    else localStorage.removeItem(`${storageKey}_from`);
  };

  const setToDate = (val) => {
    setToDateState(val);
    if (val) localStorage.setItem(`${storageKey}_to`, val);
    else localStorage.removeItem(`${storageKey}_to`);
  };

  const resetDates = () => {
    setFromDateState("");
    setToDateState("");
    localStorage.removeItem(`${storageKey}_from`);
    localStorage.removeItem(`${storageKey}_to`);
  };

  return { fromDate, setFromDate, toDate, setToDate, resetDates };
}
