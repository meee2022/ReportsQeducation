// API references for Convex queries and mutations
// These reference the functions defined in your Convex backend

// Query references
export const queries = {
  // Lessons aggregation
  lessonsAggList: "lessonsAgg:list",
  
  // Assessments aggregation
  assessmentsAggList: "assessmentsAgg:list",
  
  // Student leaderboards
  studentLeaderboardsList: "studentLeaderboards:list",
  
  // Teacher leaderboards
  teacherLeaderboardsList: "teacherLeaderboards:list",
  
  // User activity
  userActivityList: "userActivity:list",
  
  // Student interactions
  studentInteractionsList: "studentInteractions:list",
  
  // Overall stats
  overallStats: "stats:overallStats",
};

// Mutation references
export const mutations = {
  uploadLessonsCsv: "uploads:uploadLessonsCsv",
  uploadAssessmentsCsv: "uploads:uploadAssessmentsCsv",
  uploadStudentLeaderboardCsv: "uploads:uploadStudentLeaderboardCsv",
  uploadTeacherLeaderboardCsv: "uploads:uploadTeacherLeaderboardCsv",
  uploadUserActivityCsv: "uploads:uploadUserActivityCsv",
  uploadStudentInteractionsCsv: "uploads:uploadStudentInteractionsCsv",
};
