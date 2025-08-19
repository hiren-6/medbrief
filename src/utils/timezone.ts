/**
 * Timezone utility functions for handling IST (India Standard Time) conversions
 * 
 * Key principles:
 * 1. All appointment times are stored in UTC in the database
 * 2. All user interactions happen in IST
 * 3. Always convert to IST for display
 */

export const INDIA_TIMEZONE = 'Asia/Kolkata';

/**
 * Convert a date/time to IST for display
 */
export const formatDateTimeIST = (dateTime: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options
  };
  
  return date.toLocaleString('en-US', defaultOptions);
};

/**
 * Format time only in IST
 */
export const formatTimeIST = (dateTime: string | Date) => {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  
  return date.toLocaleTimeString('en-US', {
    timeZone: INDIA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format time with seconds in IST, e.g., 12:02:50 pm
 */
export const formatTimeISTWithSeconds = (dateTime: string | Date) => {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  const time = date.toLocaleTimeString('en-US', {
    timeZone: INDIA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  // Convert AM/PM to lowercase to match requested style
  return time.replace('AM', 'am').replace('PM', 'pm');
};

/**
 * Format date only in IST
 */
export const formatDateIST = (dateTime: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format date only in IST as DD-MMM-YYYY (e.g., 05-Jan-2025)
 */
export const formatDateIST_DDMMMYYYY = (dateTime: string | Date): string => {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  // Convert to IST reference date
  const ist = new Date(date.toLocaleString('en-US', { timeZone: INDIA_TIMEZONE }));
  const day = String(ist.getDate()).padStart(2, '0');
  const month = ist.toLocaleString('en-US', { month: 'short', timeZone: INDIA_TIMEZONE });
  const year = ist.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Format full datetime in IST as DD-MMM-YYYY, hh:mm:ss am/pm
 */
export const formatDateTimeIST_DDMMMYYYY = (dateTime: string | Date): string => {
  return `${formatDateIST_DDMMMYYYY(dateTime)}, ${formatTimeISTWithSeconds(dateTime)}`;
};

/**
 * Create IST datetime for storage
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:MM format
 * @returns ISO string with IST timezone
 */
export const createISTDateTime = (date: string, time: string): string => {
  // Since database is now in IST timezone, create datetime with IST offset
  const istDateTime = new Date(`${date}T${time}:00+05:30`);
  return istDateTime.toISOString();
};

/**
 * Get current time in IST
 */
export const getCurrentISTTime = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: INDIA_TIMEZONE }));
};

/**
 * Get current IST date string in YYYY-MM-DD format
 */
export const getCurrentISTDateString = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { 
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
};

/**
 * Get current IST time in minutes since midnight
 */
export const getCurrentISTTimeInMinutes = (): { date: string, minutes: number, hour: number, minute: number } => {
  const now = new Date();
  const istTime = now.toLocaleString("en-CA", {
    timeZone: INDIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const [datePart, timePart] = istTime.split(' ');
  const [hour, minute] = timePart.split(':').map(Number);
  const minutesSinceMidnight = hour * 60 + minute;
  
  return {
    date: datePart,
    minutes: minutesSinceMidnight,
    hour,
    minute
  };
};

/**
 * SIMPLE Check if a time slot is in the past
 */
export const isTimeSlotInPast = (slotDate: string, slotTime: string): boolean => {
  // Get current IST time simply
  const now = new Date();
  const currentIST = now.toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const [currentDate, currentTime] = currentIST.split(' ');
  
  // If slot is not today, it's not in the past
  if (slotDate !== currentDate) {
    return false;
  }
  
  // Simple time comparison for today
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [slotHour, slotMinute] = slotTime.split(':').map(Number);
  
  const currentMinutes = currentHour * 60 + currentMinute;
  const slotMinutes = slotHour * 60 + slotMinute;
  
  return slotMinutes <= currentMinutes;
};

/**
 * Check if two dates are the same day in IST
 */
export const isSameDayIST = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const ist1 = new Date(d1.toLocaleString("en-US", { timeZone: INDIA_TIMEZONE }));
  const ist2 = new Date(d2.toLocaleString("en-US", { timeZone: INDIA_TIMEZONE }));
  
  return ist1.toDateString() === ist2.toDateString();
};
