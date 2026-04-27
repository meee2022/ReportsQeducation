import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/lib/convex";

import {
  DashboardPage,
  UploadPage,
  LeaderboardsPage,
  AssessmentsPage,
  UserActivityPage,
  TeachersPerformancePage,
  StudentsPage,
  ComparisonsPage,
  TermSettingsPage,
  ReportsPage,
} from "@/pages";

function App() {
  return (
    <ConvexClientProvider>
      <div dir="rtl">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/leaderboards" element={<LeaderboardsPage />} />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/user-activity" element={<UserActivityPage />} />
            <Route
              path="/teachers-performance"
              element={<TeachersPerformancePage />}
            />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/comparisons" element={<ComparisonsPage />} />
            <Route path="/term-settings" element={<TermSettingsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" dir="rtl" />
      </div>
    </ConvexClientProvider>
  );
}

export default App;
