// Date utilities with Pacific timezone support

const PACIFIC_TIMEZONE = "America/Los_Angeles";

/**
 * Format a date string to Pacific time for display
 */
export function formatDatePacific(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date string to Pacific time with time
 */
export function formatDateTimePacific(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Get current date in Pacific time as YYYY-MM-DD string
 */
export function getTodayPacific(): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: PACIFIC_TIMEZONE }); // en-CA gives YYYY-MM-DD format
}

/**
 * Get current datetime in ISO format adjusted for Pacific time display
 */
export function getNowPacific(): Date {
  return new Date();
}

/**
 * Format date for display in tables (short format)
 */
export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    timeZone: PACIFIC_TIMEZONE,
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}
