/**
 * useCurrentSchool — hook يوفر schoolId و schoolName للمدرسة الحالية.
 * القيمة محفوظة في localStorage ويمكن تغييرها من صفحة الإعدادات.
 */
import { useState, useCallback } from "react";

const STORAGE_KEY = "app_school_id";
const STORAGE_NAME_KEY = "app_school_name";

export function useCurrentSchool() {
  const [schoolId, setSchoolIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ""
  );
  const [schoolName, setSchoolNameState] = useState(
    () => localStorage.getItem(STORAGE_NAME_KEY) || ""
  );

  const setSchool = useCallback((id, name) => {
    localStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(STORAGE_NAME_KEY, name);
    setSchoolIdState(id);
    setSchoolNameState(name);
  }, []);

  const clearSchool = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_NAME_KEY);
    setSchoolIdState("");
    setSchoolNameState("");
  }, []);

  return { schoolId: schoolId || undefined, schoolName, setSchool, clearSchool };
}
