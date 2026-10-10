export interface SatisfactionLevel {
  label: string;
  color: string;
  range: string;
}

export const SATISFACTION_LEVELS: SatisfactionLevel[] = [
  { label: "Poor", color: "#dc2626", range: "0 – 2.0" },
  { label: "Below Average", color: "#f97316", range: "2.1 – 2.9" },
  { label: "Average", color: "#eab308", range: "3.0 – 3.9" },
  { label: "Good", color: "#22c55e", range: "4.0 – 4.5" },
  { label: "Excellent", color: "#2563eb", range: "4.6 – 5.0" },
];

export const getSatisfactionLevel = (
  rating: number | null | undefined
): SatisfactionLevel | null => {
  if (rating === null || rating === undefined || !Number.isFinite(Number(rating))) {
    return null;
  }

  const value = Math.min(5, Math.max(0, Number(rating)));

  // Thresholds also cover the gaps between bands (e.g. 2.05, 3.95, 4.55)
  if (value <= 2) return SATISFACTION_LEVELS[0];
  if (value < 3) return SATISFACTION_LEVELS[1];
  if (value < 4) return SATISFACTION_LEVELS[2];
  if (value <= 4.5) return SATISFACTION_LEVELS[3];
  return SATISFACTION_LEVELS[4];
};

export const getSatisfactionColor = (rating: number | null | undefined): string =>
  getSatisfactionLevel(rating)?.color ?? "#e5e7eb";