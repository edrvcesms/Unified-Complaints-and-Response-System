// Utility to format hearing date as 'Month day, Year at Time'
import dayjs from "dayjs";

export function isHearingDatePast(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const date = dayjs(dateString);
  if (!date.isValid()) return false;
  return date.isBefore(dayjs());
}

export function formatHearingDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = dayjs(dateString);
  if (!date.isValid()) return String(dateString);
  return date.format("MMMM D, YYYY [at] hh:mm A");
}
