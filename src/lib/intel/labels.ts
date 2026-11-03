// Client-safe label maps shared by the API and the UI (no server imports).
export const KPI_STATUS_LABELS: Record<string, string> = {
  EXCEEDED: "Exceeded target",
  MET: "Met target",
  APPROACHING: "Approaching target",
  BELOW: "Below target",
  CRITICAL: "Critical underperformance",
  INSUFFICIENT_DATA: "Insufficient data",
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  OUTSTANDING: "Outstanding",
  EXCEEDS_EXPECTATIONS: "Exceeds Expectations",
  MEETS_EXPECTATIONS: "Meets Expectations",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  UNSATISFACTORY: "Unsatisfactory",
  INSUFFICIENT_DATA: "Insufficient Data",
};
