/**
 * Date utility functions for handling UTC dates from backend
 * Backend uses UTC (datetime.utcnow()), frontend needs to convert to local time
 */

/**
 * Converts a UTC date string from backend to local Date object
 * @param utcDateString - UTC date string from backend
 * @returns Date object in local timezone
 */
export const utcToLocal = (utcDateString: string | Date): Date => {
  if (!utcDateString) return new Date();
  
  // If already a Date object, return as is
  if (utcDateString instanceof Date) return utcDateString;
  
  // Ensure the string is treated as UTC by adding 'Z' if not present
  let dateStr = utcDateString.trim();
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('T')) {
    // Handle date-only strings
    dateStr = dateStr + 'T00:00:00Z';
  } else if (dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
    // Add Z to datetime strings without timezone info
    dateStr = dateStr + 'Z';
  }
  
  return new Date(dateStr);
};

/**
 * Format a UTC date string as localized date string
 * @param utcDateString - UTC date string from backend
 * @param options - Intl.DateTimeFormatOptions (optional)
 * @param locale - Locale string (default: "en-PH")
 * @returns Formatted date string in local timezone
 */
export const formatDate = (
  utcDateString: string | Date,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "en-PH"
): string => {
  const localDate = utcToLocal(utcDateString);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };
  
  return localDate.toLocaleDateString(locale, defaultOptions);
};

/**
 * Format a UTC date string as localized datetime string
 * @param utcDateString - UTC date string from backend
 * @param options - Intl.DateTimeFormatOptions (optional)
 * @param locale - Locale string (default: "en-PH")
 * @returns Formatted datetime string in local timezone
 */
export const formatDateTime = (
  utcDateString: string | Date,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "en-PH"
): string => {
  const localDate = utcToLocal(utcDateString);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };
  
  return localDate.toLocaleString(locale, defaultOptions);
};

/**
 * Format a UTC date string as "time ago" (e.g., "5 minutes ago", "2 hours ago")
 * @param utcDateString - UTC date string from backend
 * @returns Human-readable time difference string
 */
export const formatTimeAgo = (utcDateString: string | Date): string => {
  const localDate = utcToLocal(utcDateString);
  const now = new Date();
  
  const diffMs = now.getTime() - localDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffMs / 604800000);
  const diffMonths = Math.floor(diffMs / 2592000000);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  
  return formatDate(localDate);
};

/**
 * Get the current local time as ISO string in UTC
 * Use this when sending dates to the backend
 * @returns ISO string in UTC format
 */
export const getUtcNow = (): string => {
  return new Date().toISOString();
};

/**
 * Convert local date to UTC ISO string for backend
 * @param localDate - Date object in local timezone
 * @returns ISO string in UTC format
 */
export const localToUtc = (localDate: Date): string => {
  return localDate.toISOString();
};
